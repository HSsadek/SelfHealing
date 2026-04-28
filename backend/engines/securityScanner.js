const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const XSS_PAYLOAD = "<script>console.warn('SECURITY_SCANNER_XSS_DETECTED')</script>";
const SQLI_PAYLOAD = "' OR 1=1; --";

/**
 * Runs a basic active security scan for XSS and SQLi on a given URL.
 * It will search for inputs, inject payloads, and listen for execution or errors.
 * 
 * @param {string} url Target URL
 * @returns {object} Scan results with detected vulnerabilities
 */
const runSecurityScan = async (url) => {
    let browser;
    const findings = [];
    const logs = [];

    const log = (msg) => {
        console.log(`[SecurityScanner] ${msg}`);
        logs.push({ timestamp: new Date().toISOString(), message: msg });
    };

    try {
        log(`Initiating security scan for: ${url}`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Passive Listeners for XSS
        page.on('console', msg => {
            if (msg.text().includes('SECURITY_SCANNER_XSS_DETECTED')) {
                findings.push({ type: 'XSS', severity: 'High', description: 'Reflected XSS executed via console' });
                log(`[ALERT] XSS Payload Executed!`);
            }
        });

        // Passive Listeners for SQLi (basic error catching via response or console)
        page.on('response', async res => {
            if (res.status() >= 500) {
                log(`[WARN] Endpoint returned ${res.status()} - Check possible SQLi disruption.`);
            }
        });

        log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Phase 1: Form Injection (Active)
        log(`Searching for input fields...`);
        const inputs = await page.$$('input[type="text"], input[type="search"], textarea');
        if (inputs.length > 0) {
            log(`Found ${inputs.length} input fields. Injecting payloads...`);
            
            // XSS Injection
            for (let i = 0; i < inputs.length; i++) {
                try {
                    await inputs[i].type(XSS_PAYLOAD);
                } catch(e) {}
            }
            // Trigger forms if possible by hitting Enter on the last input
            try {
                await inputs[inputs.length - 1].press('Enter');
                // Wait to see if payload reflects
                await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
            } catch(e) {}

            log(`Checking page contents for reflections...`);
            const bodyHtml = await page.content();
            if (bodyHtml.includes(XSS_PAYLOAD)) {
                findings.push({ type: 'XSS', severity: 'High', description: 'Reflected unescaped XSS payload found in DOM' });
                log(`[ALERT] XSS Payload Reflected in DOM!`);
            }
            if (bodyHtml.toLowerCase().includes('sql syntax') || bodyHtml.toLowerCase().includes('mysql')) {
                findings.push({ type: 'SQLi', severity: 'Critical', description: 'SQL Error leaked to frontend' });
                log(`[ALERT] SQL Error Leak Detected!`);
            }

        } else {
            log(`No input fields found for active scan.`);
        }

        log(`Scan complete. Findings: ${findings.length}`);
        
        return { 
            scannedUrl: url, 
            findings: Array.from(new Set(findings.map(f => JSON.stringify(f)))).map(s => JSON.parse(s)), // Deduplicate
            logs 
        };

    } catch (err) {
        log(`Scanner error: ${err.message}`);
        return { scannedUrl: url, findings, logs, error: err.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { runSecurityScan };
