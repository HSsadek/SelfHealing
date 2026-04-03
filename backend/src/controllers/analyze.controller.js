const scraperService = require('../services/scraper.service');
const domAnalyzer = require('../services/domAnalyzer');
const aiAnalyzer = require('../services/aiAnalyzer');
const cheerio = require('cheerio');
const { withCacheAndDedup } = require('../utils/cache');

/**
 * Encapsulates the core logic so it can cleanly run inside the Cache lock.
 */
const performExtractionAndAnalysis = async (url) => {
    console.log(`[Controller] Starting analysis for URL: ${url}`);

    // Call the scraper service
    const html = await scraperService.extractHtml(url);

    // Analyze the DOM
    console.log(`[Controller] Analyzing DOM structure...`);
    const analysis = domAnalyzer.analyzeDOM(html);

    console.log(`[Controller] Found ${analysis.summary.totalIssues} issues.`);

    // Extract clean metadata for AI service using cheerio
    console.log(`[Controller] Preparing data for AI analysis...`);
    const $ = cheerio.load(html);
    const siteData = {
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        headings: $('h1, h2, h3').map((i, el) => $(el).text().trim()).get().filter(Boolean),
        imagesWithoutAlt: $('img:not([alt])').length,
        links: $('a').map((i, el) => $(el).attr('href')).get().filter(Boolean),
        textSample: $('body').text().replace(/\s+/g, ' ').trim()
    };

    // Get AI insights
    console.log(`[Controller] Requesting Gemini insights...`);
    const aiResponse = await aiAnalyzer.analyzeWithAI(siteData, analysis);

    // Merge the AI insights gracefully into the response
    analysis.aiInsights = aiResponse.aiInsights || null;
    analysis.priorityActions = aiResponse.priorityActions || [];

    console.log(`[Controller] Analysis complete.`);
    return analysis;
};

const analyzeUrl = async (req, res) => {
    try {
        const { url } = req.body;

        // Validation for the URL argument
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (err) {
            return res.status(400).json({ success: false, error: 'Invalid URL format. Make sure it includes http:// or https://' });
        }

        // Normalize URL to generate a strict unified cache key (strip queries, trailing slashes, etc if desired)
        const cacheKey = parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");

        // Execute the entire flow using the concurrency-safe Cache & Dedup wrapper
        const analysis = await withCacheAndDedup(cacheKey, () => performExtractionAndAnalysis(url));

        return res.json({
            success: true,
            analysis: analysis
        });

    } catch (error) {
        console.error(`[Controller] Error processing request: ${error.message}`);
        // Consider if it's an internal error or a scrape failure
        return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    analyzeUrl
};
