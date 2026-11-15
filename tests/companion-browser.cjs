const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const screenshots = process.argv[2] && path.resolve(process.argv[2]);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.pdf': 'application/pdf' };

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const pathname = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) return response.writeHead(404).end();
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) return response.writeHead(404).end();
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});

async function download(page, name) {
  const [artifact] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name }).click()
  ]);
  return fs.readFile(await artifact.path(), 'utf8');
}

async function exercise(browser, base, layout, viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  try {
    await page.goto(base);
    await page.getByRole('button', { name: 'Find evidence' }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(), 'Skip to Research Companion');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#main');
    const question = page.getByLabel('Question about the paper');
    await question.fill('<img src=x onerror="window.injected=1"> bats');
    await question.press('Enter');
    assert.equal(await page.locator('#answers img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.match(await page.locator('#ask-status').innerText(), /fixed evidence notes/);
    await question.fill('Was Figure 14 independently reproduced?');
    await question.press('Enter');
    assert.match(await page.locator('#ask-status').innerText(), /not independently reproduced/);
    assert.ok((await page.locator('#answers a').last().getAttribute('href')).endsWith('#page=23'));
    await question.fill('What does the paper say about bats and bees?');
    await question.press('Enter');
    assert.match(await page.locator('#answers').innerText(), /11% and 35%/);
    const citation = await page.locator('#answers a').last().getAttribute('href');
    assert.equal(citation, '../../paper/2521959.pdf#page=16');
    assert.equal((await page.request.head(new URL(citation, base).href)).status(), 200);
    if (layout === 'desktop' && screenshots) {
      await page.locator('#ask').screenshot({ path: path.join(screenshots, 'companion-desktop.jpeg'), quality: 77 });
    }

    const command = page.getByLabel('Scenario command');
    const submit = async text => { await command.fill(text); await command.press('Enter'); };
    const validate = page.getByRole('button', { name: 'Validate draft' });
    const approve = page.getByRole('button', { name: 'Approve reviewed parameters' });
    const run = page.getByRole('button', { name: 'Run approved experiment' });
    await submit('change the producer growth rate to 0.8<script>window.injected=1</script>');
    assert.ok(await page.locator('#draft-error').isVisible());
    assert.equal(await page.evaluate(() => window.injected), undefined);
    await submit('withdraw exposure at synthetic time 8, compare to time 41');
    await validate.click();
    assert.match(await page.locator('#draft-error').innerText(), /40/);
    assert.ok(await approve.isDisabled());
    const request = 'withdraw exposure at synthetic time 4, compare to time 24';
    await submit(request);
    assert.ok(await run.isDisabled());
    await validate.click();
    assert.ok(await run.isDisabled());
    await approve.click();
    assert.ok(await page.locator('#draft-results').isHidden());
    if (layout === 'mobile' && screenshots) {
      await page.locator('#draft-review').screenshot({ path: path.join(screenshots, 'companion-mobile.jpeg'), quality: 77 });
    }
    await command.fill('change the producer growth rate to 0.85');
    assert.ok(await page.locator('#draft-review').isHidden());
    await submit(request);
    await validate.click();
    await approve.click();
    await run.focus();
    await page.keyboard.press('Enter');
    const approved = JSON.parse(await download(page, 'Download experiment JSON'));
    assert.equal(approved.prompt, request);
    assert.equal(approved.approvedParameters.early, 4);
    assert.equal(approved.result.scenarios[1].metrics.cumulativeExposure, 2);
    assert.equal(approved.seed, null);
    assert.ok(await run.isDisabled());

    for (const [id, title] of [
      ['exposure', 'Run exposure timing challenge'], ['noise', 'Run noise and numerical sensitivity challenge'],
      ['preferences', 'Run decision-weight robustness challenge']
    ]) {
      const article = page.locator('#challenge-' + id);
      await article.getByRole('button', { name: title }).click();
      const [artifact] = await Promise.all([page.waitForEvent('download'),
        article.getByRole('button', { name: 'Download experiment JSON' }).click()]);
      const json = JSON.parse(await fs.readFile(await artifact.path(), 'utf8'));
      assert.equal(json.id, id);
      assert.equal(json.solverVersion, '1.0.0');
      if (id === 'preferences') {
        assert.equal(json.alternatives.length, 4);
        assert.notEqual(json.alternatives[0].ranked[0].index, json.alternatives.at(-1).ranked[0].index);
        if (layout === 'desktop' && screenshots) await article.screenshot({
          path: path.join(screenshots, 'companion-challenge.jpeg'), quality: 77
        });
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(requests.every(url => url.startsWith(new URL(base).origin) || url.startsWith('blob:')), requests.join('\n'));
    assert.deepEqual(errors, []);
    console.log(layout + ': citations, injection cases, review gate, approved export and all challenge exports passed');
  } finally { await page.close(); }
}

async function withoutJavaScript(browser, base) {
  const page = await browser.newPage({ javaScriptEnabled: false });
  try {
    await page.goto(base);
    assert.ok(await page.getByRole('link', { name: 'Original paper PDF' }).isVisible());
    await page.getByText('Read all 18 evidence notes').click();
    assert.ok(await page.getByRole('heading', { name: 'Farmer recommendations' }).isVisible());
    assert.equal(await page.locator('[data-evidence]').count(), 18);
    assert.equal((await page.request.head(new URL('../../paper/2521959.pdf#page=25', base).href)).status(), 200);
    console.log('JavaScript disabled: original PDF and the full cited library remain available');
  } finally { await page.close(); }
}

async function main() {
  if (screenshots) await fs.mkdir(screenshots, { recursive: true });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true });
    const url = 'http://127.0.0.1:' + server.address().port + '/site/companion/';
    await withoutJavaScript(browser, url);
    await exercise(browser, url, 'desktop', { width: 1280, height: 940 });
    await exercise(browser, url, 'mobile', { width: 390, height: 844 });
  } finally {
    await browser?.close();
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
