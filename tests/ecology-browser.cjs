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
  page.on('pageerror', problem => errors.push(problem.message));
  try {
    await page.goto(base + '#lab');
    await page.getByText('Experiment complete.').waitFor();
    const timeChart = page.getByRole('img', { name: 'Synthetic populations over time' });
    const phase = page.getByRole('img', { name: 'Producers versus Pests' });
    assert.equal(await timeChart.locator('polyline').count(), 3);
    assert.equal(await phase.locator('circle').count(), 1);
    assert.equal(await phase.locator('rect').count(), 1);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');

    const baseline = JSON.parse(await download(page, 'Download JSON'));
    assert.equal(baseline.metadata.seed, 2025);
    assert.equal(baseline.samples.length, 201);
    const input = name => page.getByRole('spinbutton', { name, exact: true });
    await input('Producer net growth').fill('0.95');
    await input('Multiplicative noise amplitude').fill('0');
    await input('Initial producer population').fill('12');
    assert.equal(await page.getByRole('button', { name: 'Download JSON' }).isDisabled(), true);
    await page.getByRole('button', { name: 'Run experiment' }).focus();
    await page.keyboard.press('Enter');
    const updated = JSON.parse(await download(page, 'Download JSON'));
    assert.equal(updated.metadata.initial[0], 12);
    assert.equal(updated.metadata.rates[0], .95);
    assert.equal(updated.metadata.solver, 'Explicit Euler');
    assert.ok(updated.equilibrium.jacobian?.length === 3);
    assert.notDeepEqual(updated.samples.at(-1), baseline.samples.at(-1));
    assert.ok(await page.getByRole('table', { name: 'Final synthetic population indices' }).isVisible());

    if (layout === 'desktop' && screenshots) {
      await page.locator('.nav').evaluate(el => el.style.position = 'static');
      await page.locator('#lab-results .lab-plots').first().screenshot({ path: path.join(screenshots, 'lab-desktop.jpeg'), quality: 77 });
      await page.locator('.nav').evaluate(el => el.style.removeProperty('position'));
    }

    await page.getByLabel('Runnable scenario').selectOption('withdrawal');
    const citation = page.getByRole('link', { name: 'Original equation form, Eq. 10, p. 15' });
    const href = await citation.getAttribute('href');
    assert.ok(href.endsWith('/paper/2521959.pdf#page=15'));
    assert.equal((await page.request.head(href)).status(), 200);
    await input('Simulation horizon').fill('10');
    await page.getByRole('button', { name: 'Run experiment' }).click();
    assert.match(await page.getByRole('alert').innerText(), /within the simulation horizon/);
    assert.ok(await page.locator('#lab-json').isDisabled());
    await page.getByRole('button', { name: 'Restore defaults' }).click();
    assert.equal(await page.locator('#lab-error').isHidden(), true);
    await page.getByLabel('Sensitivity parameter').selectOption('exposure');
    await page.getByRole('button', { name: 'Run experiment' }).click();
    const csv = await download(page, 'Download CSV');
    assert.match(csv, /Structural reconstruction with illustrative parameters/);
    assert.match(csv, /"sensitivity","40","exposure"/);
    assert.equal(await timeChart.locator('polyline').count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    if (layout === 'mobile' && screenshots) {
      await page.locator('.nav').evaluate(el => el.style.position = 'static');
      await page.locator('#lab-results .lab-plots').first().screenshot({ path: path.join(screenshots, 'lab-mobile.jpeg'), quality: 77 });
    }
    console.log(layout + ': 3 parameter changes, keyboard run, plots, equilibrium, source link, validation, reset and both exports passed');
  } catch (error) {
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'failure-ecology-' + layout + '.png') }).catch(() => {});
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
    const url = base + 'site/';
    await exercise(browser, url, 'desktop', { width: 1280, height: 940 });
    await exercise(browser, url, 'mobile', { width: 390, height: 844 });
  } finally {
    await browser?.close();
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
