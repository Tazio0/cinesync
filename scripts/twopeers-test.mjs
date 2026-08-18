import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream']
  });

  try {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    const logPage = (p, name) => {
      p.on('console', (msg) => console.log(`[${name} PAGE]`, msg.type(), msg.text()));
      p.on('request', (r) => console.log(`[${name} REQ]`, r.method(), r.url()));
      p.on('response', (r) => console.log(`[${name} RES]`, r.status(), r.url()));
    };

    logPage(page1, 'P1');
    logPage(page2, 'P2');

    const TARGET = process.env.TARGET_URL || process.env.VERCEL_URL || 'http://localhost:5173';
    const url = TARGET.startsWith('http') ? TARGET : `https://${TARGET}`;
    await page1.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page1.waitForSelector('.btn-lobby-primary', { timeout: 10000 });
    await page1.click('.btn-lobby-primary');
    console.log('P1: Created room');

    // wait for peer id to open and URL hash to be set
    await new Promise((r) => setTimeout(r, 1500));
    const hash = await page1.evaluate(() => window.location.hash || '');
    console.log('P1 Hash:', hash);

    const roomParam = (hash && hash.includes('#room=')) ? hash.split('#room=')[1] : null;
    if (!roomParam) {
      throw new Error('Could not get room id from P1');
    }

    // Open page2 with the room hash to join
    const joinUrl = `${url.replace(/\/$/, '')}/#room=${roomParam}`;
    await page2.goto(joinUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('P2: navigated to join url');

    // The invite join page shows an Enter Watch Party button with .btn-lobby-primary
    await page2.waitForSelector('.btn-lobby-primary', { timeout: 10000 });
    await page2.click('.btn-lobby-primary');
    console.log('P2: clicked enter watch party');

    // Wait for mesh logs and potential connection establishment
    await new Promise((r) => setTimeout(r, 5000));

    console.log('Two-peer test completed');
  } catch (err) {
    console.error('Two-peer test error:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
