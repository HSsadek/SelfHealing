const puppeteer = require('puppeteer');

const extractHtml = async (url) => {
    let browser;
    try {
        console.log(`[Scraper Service] Launching browser...`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        console.log(`[Scraper Service] Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log(`[Scraper Service] Extracting HTML...`);
        const html = await page.content();
        
        return html;
    } catch (error) {
        console.error(`[Scraper Service] Puppeteer Error: ${error.message}`);
        throw new Error(`Failed to extract HTML from ${url}. ${error.message}`);
    } finally {
        if (browser) {
            console.log(`[Scraper Service] Closing browser...`);
            await browser.close();
        }
    }
};

module.exports = {
    extractHtml
};
