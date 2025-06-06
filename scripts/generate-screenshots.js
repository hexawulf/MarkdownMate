const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewport({
      width: 1600,
      height: 900,
      deviceScaleFactor: 1
    });

    console.log('Generating landing page screenshot...');
    
    // Navigate to the landing page
    await page.goto('http://localhost:5000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for fonts and images to load
    await page.waitForTimeout(2000);

    // Ensure screenshots directory exists
    const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Take screenshot of landing page
    await page.screenshot({
      path: path.join(screenshotsDir, 'landing-page.png'),
      fullPage: true,
      type: 'png'
    });

    console.log('Landing page screenshot saved to docs/screenshots/landing-page.png');

    // Optional: Generate editor screenshot if user is authenticated
    try {
      await page.goto('http://localhost:5000/editor', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });
      
      await page.waitForTimeout(2000);
      
      await page.screenshot({
        path: path.join(screenshotsDir, 'editor-view.png'),
        fullPage: false,
        type: 'png'
      });

      console.log('Editor screenshot saved to docs/screenshots/editor-view.png');
    } catch (error) {
      console.log('Could not capture editor screenshot (requires authentication)');
    }

  } catch (error) {
    console.error('Error generating screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  generateScreenshots().then(() => {
    console.log('Screenshot generation complete');
    process.exit(0);
  }).catch(error => {
    console.error('Screenshot generation failed:', error);
    process.exit(1);
  });
}

module.exports = { generateScreenshots };