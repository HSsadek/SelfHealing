const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth behavior to evade basic bot detection
puppeteer.use(StealthPlugin());

const extractHtml = async (url, retries = 3) => {
    let browser;
    let attempt = 0;

    while (attempt < retries) {
        attempt++;
        try {
            console.log(`[Scraper Service] Attempt ${attempt}/${retries}: Launching browser...`);
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
            });
            
            const page = await browser.newPage();
            
            // Randomize user agent as a fallback measure
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log(`[Scraper Service] Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            console.log(`[Scraper Service] Extracting HTML...`);
            const html = await page.content();
            
            return html;
        } catch (error) {
            console.error(`[Scraper Service] Error on attempt ${attempt}: ${error.message}`);
            
            if (browser) {
                await browser.close();
                browser = null;
            }

            if (attempt >= retries) {
                console.error(`[Scraper Service] Exhausted all ${retries} attempts for ${url}.`);
                throw new Error(`Failed to extract HTML from ${url} after ${retries} attempts: ${error.message}`);
            }

            // Exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[Scraper Service] Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
        } finally {
            if (browser) {
                console.log(`[Scraper Service] Closing browser...`);
                await browser.close();
            }
        }
    }
};

module.exports = {
    extractHtml
};
