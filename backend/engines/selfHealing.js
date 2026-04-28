const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const { geminiQueue } = require('../src/utils/queue'); // Re-using existing queue if possible, or fallback
// Fallback if queue is not exposed this way
let aiQueue;
try {
    aiQueue = require('../src/utils/queue').geminiQueue;
} catch(e) {
    // Basic mock if queue is unavailable during extraction
    aiQueue = { wrap: (fn) => fn };
}

const SmartMemory = require('../src/models/HealedSelector');
const socketManager = require('../src/utils/socketManager');

const SYSTEM_PROMPT = `You are an expert automated testing Self-Healing Engine.
A UI automation script failed to find a specific CSS selector.
Analyze the provided DOM snapshot around the failure point and the original failed selector, and output a NEW, valid CSS selector that most likely represents the intended element.

Respond STRICTLY in JSON format:
{
  "newSelector": "css selector here",
  "confidence": 0.0 - 1.0,
  "reasoning": "brief explanation"
}`;

const callGeminiHealing = async (payload) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new Error("Missing GEMINI_API_KEY");

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: payload }]
            }
        ],
        generationConfig: {
            temperature: 0.2 // Lower temp for more deterministic code output
        }
    };

    const response = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" }
    });

    return response.data.candidates[0].content.parts[0].text;
};

const processHealing = async (failedSelector, targetAction, domContext) => {
    const optimizedHTML = domContext.substring(0, 3000); // Send just a safe chunk of DOM

    const prompt = `${SYSTEM_PROMPT}

Data:
- Failed Selector: ${failedSelector}
- Intended Action: ${targetAction}
- DOM Context:
${optimizedHTML}
`;

    const healingFn = aiQueue && aiQueue.wrap ? aiQueue.wrap(callGeminiHealing) : callGeminiHealing;
    const resultText = await healingFn(prompt);
    
    try {
        const cleaned = resultText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        const parsed = JSON.parse(cleaned);
        
        // Ensure format compliance
        if (!parsed.newSelector || parsed.confidence === undefined) {
             throw new Error("Invalid format returned by LLM");
        }
        return parsed;
    } catch (e) {
        console.error("[Self-Healing] Failed to parse LLM response:", e);
        return { newSelector: null, confidence: 0, reasoning: "Error parsing LLM response" };
    }
};

/**
 * Attempts to heal a broken selector by examining the current DOM.
 * @param {object} page - Puppeteer page object
 * @param {string} failedSelector - The selector that was not found
 * @param {string} targetAction - Discription of what we were trying to do (e.g. click 'submit')
 * @returns {object} - { success: true/false, newSelector, confidence }
 */
const healSelector = async (page, failedSelector, targetAction) => {
    try {
        console.log(`[Self-Healing] Attempting to heal broken selector: ${failedSelector}`);
        
        // Extract DOM chunk (assuming the element might be nearby or we grab the whole body)
        // Extracting just enough body to analyze structure.
        const domContext = await page.evaluate(() => {
            // Strip out scripts and styles to save tokens
            const clone = document.body.cloneNode(true);
            const scripts = clone.querySelectorAll('script, style, svg');
            scripts.forEach(s => s.remove());
            return clone.innerHTML;
        });

        // Check Database/Memory first
        const io = socketManager.getIO();
        io.emit('issue_detected', { originalSelector: failedSelector, action: targetAction, message: `Element not found: ${failedSelector}` });

        const rememberedFix = await SmartMemory.getFix(failedSelector, targetAction);
        if (rememberedFix) {
            console.log(`[Self-Healing] Found remembered fix in DB: ${rememberedFix}`);
            io.emit('fix_generated', { 
                originalSelector: failedSelector, 
                newSelector: rememberedFix, 
                confidence: 99, 
                source: 'memory'
            });
            return {
                success: true,
                originalSelector: failedSelector,
                newSelector: rememberedFix,
                confidence: 99,
                reasoning: "Loaded from Smart Memory DB"
            };
        }

        io.emit('fix_generated', { message: 'Querying Gemini AI for fix...' });

        const remedy = await processHealing(failedSelector, targetAction, domContext);
        
        if (remedy.confidence >= 0.7 && remedy.newSelector) {
            console.log(`[Self-Healing] High confidence fix found: ${remedy.newSelector} (${remedy.confidence})`);
            
            // Save to Memory
            await SmartMemory.saveFix(failedSelector, remedy.newSelector, targetAction);

            io.emit('fix_success', { 
                originalSelector: failedSelector, 
                newSelector: remedy.newSelector, 
                confidence: Math.round(remedy.confidence * 100),
                reasoning: remedy.reasoning 
            });

            return {
                success: true,
                originalSelector: failedSelector,
                newSelector: remedy.newSelector,
                confidence: remedy.confidence,
                reasoning: remedy.reasoning
            };
        } else {
            console.warn(`[Self-Healing] Low confidence or no fix found (${remedy.confidence})`);
            return { success: false, confidence: remedy.confidence, originalSelector: failedSelector };
        }
    } catch(err) {
        console.error("[Self-Healing Engine Error]", err.message);
        return { success: false, error: err.message };
    }
};

module.exports = { healSelector };
