const axios = require('axios');
const cheerio = require('cheerio');

const callGeminiForSelector = async (htmlSnapshot, oldSelector, intent) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const SYSTEM_PROMPT = `You are a self-healing UI test automation AI.
A test execution failed to find an element.
Intent/Description of the element: "${intent}"
Broken CSS Selector: "${oldSelector}"

I will provide you with the current HTML structure of the page.
Analyze the HTML and find the updated CSS selector for this element.
Return STRICT JSON ONLY in this format:
{
    "success": true|false,
    "newSelector": "css_selector_here",
    "reasoning": "short explanation of what changed"
}`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // To save tokens, keep only the body and strip script/style tags.
    const $ = cheerio.load(htmlSnapshot);
    $('script, style, svg, iframe, noscript').remove();
    const cleanHtml = $('body').html() || htmlSnapshot;
    // Limit to prevent overloading context
    const truncatedHtml = cleanHtml.slice(0, 30000); 

    const body = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: SYSTEM_PROMPT },
                    { text: `\n\n--- CURRENT HTML ---\n${truncatedHtml}` }
                ]
            }
        ]
    };

    const response = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" }
    });

    const resultText = response.data.candidates[0].content.parts[0].text;
    const cleaned = resultText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    return JSON.parse(cleaned);
};

/**
 * Tries to locate an element. If it fails, uses AI to find the new selector.
 * 
 * @param {object} page - Puppeteer page object
 * @param {string} selector - The old/expected CSS selector
 * @param {string} intent - Human readable description of what we are looking for
 * @returns {object} An object containing the ElementHandle and the used selector
 */
const smartLocator = async (page, selector, intent) => {
    try {
        // 1. Attempt standard detection first
        const element = await page.waitForSelector(selector, { timeout: 3000 });
        return { element, usedSelector: selector, healed: false };
    } catch (err) {
        console.warn(`[Self-Healer] Selector "${selector}" failed. Initiating AI recovery for intent: "${intent}"...`);
        
        // 2. Extract DOM snapshot for the AI
        const htmlSnapshot = await page.content();
        
        try {
            // 3. Ask AI for the new selector
            const aiDecision = await callGeminiForSelector(htmlSnapshot, selector, intent);
            
            if (aiDecision.success && aiDecision.newSelector) {
                console.log(`[Self-Healer] AI suggests new selector: "${aiDecision.newSelector}"`);
                console.log(`[Self-Healer] Reasoning: ${aiDecision.reasoning}`);
                console.log(`[Self-Healer] *** CODE REPAIR SUGGESTION: Update your test scripts to use "${aiDecision.newSelector}" instead of "${selector}" ***`);
                
                // 4. Try again with the new selector
                const healedElement = await page.waitForSelector(aiDecision.newSelector, { timeout: 5000 });
                return { element: healedElement, usedSelector: aiDecision.newSelector, healed: true };
            } else {
                throw new Error("AI failed to determine a new selector.");
            }
        } catch (aiErr) {
            console.error(`[Self-Healer] AI Recovery failed: ${aiErr.message}`);
            // Rethrow the original throw to let the test fail naturally if healing is impossible
            throw err; 
        }
    }
};

module.exports = {
    smartLocator
};
