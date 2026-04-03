/**
 * AI Analyzer Service (REST VERSION - NO SDK)
 * 
 * TEMPORARILY DISABLED DUE TO API ISSUES
 * Code kept fully intact for reversibility.
 */


const axios = require("axios");
const axiosRetry = require("axios-retry").default || require("axios-retry");
const { geminiQueue } = require("../utils/queue");

// Configure robust retries for Gemini API directly on axios
axiosRetry(axios, {
    retries: 4, // More aggressive retries for AI calls
    retryDelay: (retryCount) => {
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s, 16s
        const jitter = delay * 0.2 * Math.random(); // Add up to 20% jitter
        return delay + jitter;
    },
    retryCondition: (error) => {
        // Retry exclusively on 429 Too Many Requests or 5xx server issues
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
    },
    onRetry: (retryCount, error, requestConfig) => {
        console.warn(`[AI Retry] Attempt ${retryCount} for Gemini API. Reason: ${error.message}`);
    }
});

const SYSTEM_PROMPT = `You are an expert web usability, content, and SEO auditor.

Return STRICT JSON only in this format:
{
  "aiInsights": {
    "ux": { "score": 0-100, "problems": [], "suggestions": [] },
    "content": { "score": 0-100, "problems": [], "suggestions": [] },
    "seo": { "score": 0-100, "problems": [], "suggestions": [] }
  },
  "priorityActions": [
    { "issue": "", "impact": "high|medium|low", "fix": "" }
  ]
}

Be concise and actionable.`;

const optimizeInputTokens = (siteData, staticIssues) => {
    const truncatedText = siteData.textSample
        ? siteData.textSample.slice(0, 1000)
        : '';

    return {
        title: siteData.title || "Missing title",
        metaDescription: siteData.metaDescription || "Missing description",
        headings: siteData.headings || [],
        imagesWithoutAlt: siteData.imagesWithoutAlt || 0,
        linksCount: siteData.links ? siteData.links.length : 0,
        textSample: truncatedText,
        knownIssues: staticIssues?.issues || []
    };
};

const getFallbackResponse = (errorMessage) => ({
    aiInsights: {
        ux: { score: 0, problems: ["AI failed"], suggestions: [] },
        content: { score: 0, problems: ["AI failed"], suggestions: [] },
        seo: { score: 0, problems: ["AI failed"], suggestions: [] }
    },
    priorityActions: [
        {
            issue: "AI Layer Unavailable (Gemini)",
            impact: "high",
            fix: errorMessage
        }
    ]
});

const callGemini = async (payload) => {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: payload }]
            }
        ]
    };

    const response = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" }
    });

    return response.data.candidates[0].content.parts[0].text;
};

// Wrap Gemini Call inside the global rate-limiter Queue
const queuedCallGemini = geminiQueue.wrap(callGemini);

const analyzeWithAI = async (siteData, staticIssues) => {
    try {
        const optimized = optimizeInputTokens(siteData, staticIssues);

        const prompt = `${SYSTEM_PROMPT}
            DATA:${JSON.stringify(optimized)}`;

        // Process request through the Queue & Retry wrapper
        const resultText = await queuedCallGemini(prompt);

        // clean + parse safely
        const cleaned = resultText
            .replace(/\`\`\`json/g, "")
            .replace(/\`\`\`/g, "")
            .trim();

        return JSON.parse(cleaned);

    } catch (error) {
        console.error("[AI REST ERROR]", error.message);
        // Fallback gracefully so the main API doesn't crash 
        return getFallbackResponse(error.message);
    }
};

module.exports = {
    analyzeWithAI
};