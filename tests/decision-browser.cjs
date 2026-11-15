const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { startPreview } = require('../scripts/preview-server.cjs');
const path = require('node:path');

const screenshots = process.argv[2] && path.resolve(process.argv[2]);

async function download(page, name) {
  const [artifact] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name }).click()
  ]);
  return fs.readFile(await artifact.path(), 'utf8');
}

async function exercise(browser, base, layout, viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.getByText('Three aligned simulations complete.', { exact: false }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(), 'Skip to Decision Studio');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#main');
    assert.equal(await page.locator('#scenario-cards article').count(), 3);
    assert.match(await page.locator('#scenario-cards article').first().innerText(), /no withdrawal/i);
    const plot = page.getByRole('img', { name: 'Producer population trajectories' });
    assert.equal(await plot.locator('polyline').count(), 3);
    const baseline = JSON.parse(await download(page, 'Download brief JSON'));
    assert.equal(baseline.comparison.seed, null);
    const begin = page.getByRole('spinbutton', { name: /^Early withdrawal/ });
    const end = page.getByRole('spinbutton', { name: /^Late withdrawal/ });
    await begin.fill('28');
    await end.fill('20');
    assert.ok(await page.getByRole('button', { name: 'Download brief JSON' }).isDisabled());
    await page.getByRole('button', { name: 'Run controlled comparison' }).focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#scenario-error').innerText(), /early ≤ late/);
    await begin.fill('4');
    await page.getByRole('button', { name: 'Run controlled comparison' }).click();
    const revised = JSON.parse(await download(page, 'Download brief JSON'));
    assert.equal(revised.comparison.scenarios[1].metrics.cumulativeExposure, 2);
    assert.deepEqual(revised.comparison.scenarios[0].samples, baseline.comparison.scenarios[0].samples);
    assert.notDeepEqual(revised.comparison.scenarios[1].samples, baseline.comparison.scenarios[1].samples);
    assert.deepEqual(revised.comparison.scenarios[0].samples[0], revised.comparison.scenarios[1].samples[0]);
    const ratio = page.getByRole('spinbutton', { name: 'Integrated producer index / Integrated consumer index' });
    await ratio.fill('10');
    await page.getByRole('button', { name: 'Update preferences' }).click();
    assert.match(await page.locator('#judgment-error').innerText(), /between 1\/9 and 9/);
    await ratio.fill('4');
    await page.getByRole('button', { name: 'Update preferences' }).focus();
    await page.keyboard.press('Enter');
    const brief = JSON.parse(await download(page, 'Download brief JSON'));
    assert.equal(brief.decision.ahp.matrix[0][1], 4);
    assert.notDeepEqual(brief.decision.ranking.weights, revised.decision.ranking.weights);
    assert.ok(brief.decision.preference.weights[2] > brief.decision.ranking.weights[2]);
    assert.equal(brief.reportedRecommendations.source.page, 25);
    assert.equal(brief.decision.pareto.length, 3);
    assert.ok(await page.getByRole('table', { name: 'TOPSIS closeness and rank' }).isVisible());
    assert.match(await download(page, 'Download scenario CSV'), /"sample","early","0","10","5"/);
    const evidence = await page.locator('a[href*=".pdf#page="]').evaluateAll(links => links.map(a => a.href));
    for (const href of new Set(evidence)) assert.equal((await page.request.head(href)).status(), 200, href);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.getByRole('button', { name: 'Print decision brief' }).isHidden(), true);
    assert.ok(await plot.isVisible());
    await page.emulateMedia({ media: 'screen' });
    if (screenshots) {
      const chart = page.locator('#scenario-results figure');
      await chart.screenshot({ path: path.join(screenshots, 'decision-' + layout + '.jpeg'), quality: 77 });
      if (layout === 'desktop') {
        await page.locator('#rankings').locator('..').screenshot({
          path: path.join(screenshots, 'decision-ranking.jpeg'), quality: 77
        });
      }
    }
    await page.getByRole('link', { name: 'Ecological Dynamics Lab' }).click();
    await page.getByRole('heading', { name: 'Ecological Dynamics Laboratory' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(layout + ': 3 aligned arms, keyboard run, validation, editable priorities, rankings, printable charts, links and exports passed');
  } catch (error) {
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'failure-decision-' + layout + '.png') }).catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

async function main() {
  if (screenshots) await fs.mkdir(screenshots, { recursive: true });
  const { server, base } = await startPreview();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true });
    const url = base + 'site/decision/';
    await exercise(browser, url, 'desktop', { width: 1280, height: 940 });
    await exercise(browser, url, 'mobile', { width: 390, height: 844 });
  } finally {
    await browser?.close();
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
