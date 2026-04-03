const cheerio = require('cheerio');

/**
 * Analyzes the given HTML and returns a structured report of issues.
 * @param {string} html 
 * @returns {object} Analysis report
 */
const analyzeDOM = (html) => {
    // Boilerplate safe return
    const defaultResponse = {
        summary: { totalIssues: 0, high: 0, medium: 0, low: 0 },
        issues: []
    };

    if (!html || typeof html !== 'string') {
        return defaultResponse;
    }

    try {
        const $ = cheerio.load(html);
        const issues = [];

        // Helper to add issues safely
        const addIssue = (type, message, severity, selector) => {
            issues.push({ type, message, severity, selector });
        };

        // ==========================================
        // 1. Accessibility Checks
        // ==========================================
        
        // Images missing alt attribute
        $('img:not([alt])').each((i, el) => {
            const selector = `img${el.attribs.src ? `[src="${el.attribs.src}"]` : ''}`;
            addIssue('accessibility', 'Image is missing alt attribute', 'medium', selector);
        });

        // Buttons without visible text (not checking computed styles, just text content)
        $('button').each((i, el) => {
            const text = $(el).text().trim();
            if (!text && !el.attribs['aria-label']) {
                const id = el.attribs.id ? `#${el.attribs.id}` : '';
                const className = el.attribs.class ? `.${el.attribs.class.split(' ').join('.')}` : '';
                addIssue('accessibility', 'Button has no visible text or aria-label', 'high', `button${id}${className}`);
            }
        });

        // Inputs without labels (simplified check: no aria-label and no associated <label>)
        $('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').each((i, el) => {
            const id = el.attribs.id;
            const hasAriaLabel = !!el.attribs['aria-label'];
            let hasLabel = false;
            if (id) {
                hasLabel = $(`label[for="${id}"]`).length > 0;
            } else {
                hasLabel = $(el).closest('label').length > 0;
            }

            if (!hasLabel && !hasAriaLabel) {
                const selectorId = id ? `#${id}` : '';
                const name = el.attribs.name ? `[name="${el.attribs.name}"]` : '';
                addIssue('accessibility', 'Input is missing an associated label', 'high', `input${selectorId}${name}`);
            }
        });


        // ==========================================
        // 2. SEO Checks
        // ==========================================
        
        // Missing <title>
        if ($('title').length === 0 || !$('title').text().trim()) {
            addIssue('seo', 'Missing or empty <title> tag', 'high', 'head > title');
        }

        // Missing meta description
        if ($('meta[name="description"]').length === 0) {
            addIssue('seo', 'Missing meta description', 'high', 'head > meta[name="description"]');
        }

        // <h1> checks
        const h1Count = $('h1').length;
        if (h1Count === 0) {
            addIssue('seo', 'Missing <h1> heading', 'medium', 'body > h1');
        } else if (h1Count > 1) {
            addIssue('seo', 'Multiple <h1> headings found. Best practice is to have exactly one.', 'low', 'h1');
        }

        // ==========================================
        // 3. Structure Checks
        // ==========================================
        
        // Duplicate IDs
        const ids = new Set();
        $('[id]').each((i, el) => {
            const id = el.attribs.id;
            if (id && ids.has(id)) {
                addIssue('structure', `Duplicate ID found: "${id}"`, 'high', `#${id}`);
            }
            if (id) {
                ids.add(id);
            }
        });

        // Empty links (<a> without href or empty href)
        $('a').each((i, el) => {
            const href = el.attribs.href;
            if (!href || href.trim() === '' || href === '#') {
                const id = el.attribs.id ? `#${el.attribs.id}` : '';
                const className = el.attribs.class ? `.${el.attribs.class.split(' ').join('.')}` : '';
                addIssue('structure', 'Empty link or missing href', 'medium', `a${id}${className}`);
            }
        });

        // Missing lang attribute on <html>
        if (!$('html').attr('lang')) {
            addIssue('structure', 'Missing lang attribute on <html> tag', 'low', 'html');
        }

        // Remove duplicates just in case
        const uniqueIssues = Array.from(new Set(issues.map(JSON.stringify))).map(JSON.parse);

        // Group issues by type internally before returning
        const groupedIssues = uniqueIssues.sort((a, b) => {
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;
            return 0;
        });

        // Calculate summary
        const summary = {
            totalIssues: groupedIssues.length,
            high: groupedIssues.filter(i => i.severity === 'high').length,
            medium: groupedIssues.filter(i => i.severity === 'medium').length,
            low: groupedIssues.filter(i => i.severity === 'low').length,
        };

        return {
            summary,
            issues: groupedIssues
        };

    } catch (error) {
        console.error(`[DOM Analyzer] Error parsing HTML:`, error);
        return defaultResponse;
    }
};

module.exports = {
    analyzeDOM
};
