import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream']
  });

  try {
    const page = await browser.newPage();

    page.on('console', (msg) => {
      console.log('[PAGE]', msg.type(), msg.text());
    });

    page.on('request', (req) => {
      console.log('[REQ]', req.method(), req.url());
    });

    page.on('response', async (res) => {
      try {
        console.log('[RES]', res.status(), res.url());
      } catch (e) {}
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 60000 });

    // If lobby present, create a new room
    try {
      await page.waitForSelector('.btn-lobby-primary', { timeout: 3000 });
      // Click the first primary lobby button (Create New Watch Party)
      await page.click('.btn-lobby-primary');
      console.log('Clicked create room button');
    } catch (e) {
      console.log('Create button not found or already in room');
    }

    // Wait for chat input to appear (join room flow may take a moment)
    await page.waitForSelector('.chat-text-input', { timeout: 20000 });

    await page.click('.chat-text-input');
    await page.type('.chat-text-input', 'Hello from headless test');

    // Click send button
    await page.click('.send-msg-btn');

    // Wait a bit to capture outgoing requests/console logs
    await new Promise((r) => setTimeout(r, 3000));

    console.log('Headless test completed');
  } catch (err) {
    console.error('Headless test error:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
