/**
 * Static Analyzer Service
 * Replaces the AI layer temporarily with deterministic rule-based logic.
 */

const analyzeWithStaticEngine = (siteData) => {
    console.log("[Static Mode] AI disabled temporarily - using rule-based engine");

    let uxScore = 100;
    let seoScore = 100;
    let contentScore = 100;

    const uxProblems = [];
    const seoProblems = [];
    const contentProblems = [];
    const priorityActions = [];

    // --- UX Rules ---
    if (!siteData.title || siteData.title === 'Missing title') {
        uxScore -= 20;
        uxProblems.push('Missing page title.');
        priorityActions.push({ issue: 'Missing Title', impact: 'high', fix: 'Add a <title> tag to the document head.' });
    }
    if (siteData.imagesWithoutAlt > 0) {
        uxScore -= 10;
        uxProblems.push(`${siteData.imagesWithoutAlt} images are missing alt text.`);
        priorityActions.push({ issue: 'Missing Alt Text', impact: 'medium', fix: 'Add alt attributes to all <img> tags.' });
    }
    if (!siteData.headings || siteData.headings.length === 0) {
        uxScore -= 15;
        uxProblems.push('No headings found, making navigation difficult.');
    }

    // --- SEO Rules ---
    if (!siteData.metaDescription || siteData.metaDescription === 'Missing description') {
        seoScore -= 25;
        seoProblems.push('Missing meta description.');
        priorityActions.push({ issue: 'Missing Meta Description', impact: 'high', fix: 'Add <meta name="description" content="..."> to the head.' });
    }
    if (siteData.headings && siteData.headings.length < 2) {
        seoScore -= 10;
        seoProblems.push('Low heading count.');
    }
    if (!siteData.links || siteData.links.length === 0) {
        seoScore -= 20;
        seoProblems.push('No links found on the page.');
    }

    // --- Content Rules ---
    if (!siteData.textSample || siteData.textSample.length < 100) {
        contentScore -= 40;
        contentProblems.push('Very short text content.');
        priorityActions.push({ issue: 'Thin Content', impact: 'high', fix: 'Expand page content to provide more value.' });
    }
    if (!siteData.headings || siteData.headings.length === 0) {
        contentScore -= 15;
        contentProblems.push('Content lacks structured headings.');
    }

    // Cap scores loosely at 0 minimum
    uxScore = Math.max(0, uxScore);
    seoScore = Math.max(0, seoScore);
    contentScore = Math.max(0, contentScore);

    return {
        aiInsights: {
            ux: {
                score: uxScore,
                problems: uxProblems,
                suggestions: ['Review accessibility guidelines.', 'Ensure clear visual hierarchy.']
            },
            content: {
                score: contentScore,
                problems: contentProblems,
                suggestions: ['Add more descriptive paragraphs.', 'Use bullet points for readability.']
            },
            seo: {
                score: seoScore,
                problems: seoProblems,
                suggestions: ['Include target keywords in headers.', 'Ensure all links are descriptive.']
            }
        },
        priorityActions: priorityActions.slice(0, 4) // Show up to top 4 issues
    };
};

module.exports = {
    analyzeWithStaticEngine
};
