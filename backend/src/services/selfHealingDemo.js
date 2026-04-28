require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const { smartLocator } = require('../utils/selfHealing');

const runDemo = async () => {
    console.log("=== OTONOM SELF-HEALING TEST BOTU BAŞLIYOR ===");
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Açılacak test sayfası (Demin oluşturduğumuz dosya)
    const testPageUrl = `file:///${path.join(__dirname, '../../test-ui.html').replace(/\\/g, '/')}`;
    console.log(`Test sayfasına gidiliyor: ${testPageUrl}`);
    await page.goto(testPageUrl);

    // Kasten yanlış (eski) bir selector veriyoruz: "#submit-button"
    // Halbuki sayfada o anki butonun ID'si "#auth-confirm-btn" olarak değiştirilmiş.
    const EXPECTED_SELECTOR = '#submit-button';
    const INTENT = 'Kullanıcının sisteme giriş yapmasını sağlayan ana mavi onay butonu. (Üzerinde Hesaba Giriş Yap veya Giriş Yap yazar)';

    console.log(`\nAdım 1: "${EXPECTED_SELECTOR}" butonu aranıyor (Kasıtlı olarak yanlış)...`);
    
    try {
        // Normalde page.waitForSelector atarsanız patlar. Biz smartLocator atıyoruz.
        const result = await smartLocator(page, EXPECTED_SELECTOR, INTENT);
        
        console.log(`\n=== GÖREV BAŞARILI ===`);
        console.log(`Tıklanıyor: ${result.usedSelector}`);
        
        // Elementi bulduysak tıklayalım (simülasyon)
        await result.element.click();
        console.log("Tıklama işlemi sorunsuz tamamlandı. Test ölmekten kurtarıldı!");
        
    } catch (e) {
        console.error("Test onarılamadı ve çöktü:", e.message);
    } finally {
        await browser.close();
    }
};

runDemo();
