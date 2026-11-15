const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { startPreview } = require('../scripts/preview-server.cjs');
const screenshots = process.argv[2];

async function exercise(browser, base, layout, viewport) {
  const page = await browser.newPage({ viewport, reducedMotion:'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    assert.equal((await page.request.get(new URL('/site/',base).href)).status(),404);
    await page.goto(base);
    await page.getByRole('link',{name:'Open the portfolio'}).click();
    await page.getByRole('heading',{name:'The Verdant Metamorphosis',level:1}).waitFor();
    assert.ok(page.url().startsWith(base+'site/'));
    if (screenshots) await page.screenshot({path:path.join(screenshots,'release-home-'+layout+'.jpeg'),quality:75});
    await page.keyboard.press('Tab');
    await page.getByRole('link',{name:'Skip to Research Story'}).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#research');
    const story = page.locator('#research');
    assert.equal(await story.locator('article.story-chapter').count(),7);
    const radio = story.getByRole('radio',{name:/Paper View/});
    await radio.focus();
    await page.keyboard.press('ArrowRight');
    assert.ok(await story.getByRole('radio',{name:'Interpretation View'}).isChecked());
    assert.equal(await story.locator('.story-interpretation:visible').count(),6);
    await page.keyboard.press('ArrowLeft');
    assert.ok(await radio.isChecked());
    const trail = page.locator('#withdrawal');
    await trail.locator('summary').focus();
    await page.keyboard.press('Space');
    assert.equal(await trail.evaluate(el=>el.open),true);
    assert.ok(await trail.getByText('Open limitation').isVisible());
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
    const widths = await story.locator('img').evaluateAll(images=>Promise.all(images.map(async img=>{
      img.loading='eager'; await img.decode(); return img.naturalWidth;
    })));
    assert.equal(widths.length,15);
    assert.ok(widths.every(Boolean));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if (screenshots) {
      await page.goto(base+'site/#ecosystem');
      await page.locator('#ecosystem img').first().evaluate(img=>{img.loading='eager';return img.decode()});
      await page.screenshot({path:path.join(screenshots,'release-story-'+layout+'.jpeg'),quality:75});
    }
    await page.getByRole('navigation',{name:'Portfolio',exact:true}).getByRole('link',{name:'Decision Studio'}).click();
    assert.ok(page.url().startsWith(base+'site/decision/'));
    const nav = page.getByRole('navigation',{name:'Portfolio',exact:true});
    await nav.getByRole('link',{name:'Research Companion'}).click();
    assert.ok(page.url().startsWith(base+'site/companion/'));
    await page.getByRole('navigation',{name:'Portfolio',exact:true}).getByRole('link',{name:'Original Evidence'}).click();
    await page.waitForURL('**/site/#evidence');
    await page.locator('#evidence').getByRole('link',{name:'Figure Atlas'}).click();
    assert.ok(page.url().startsWith(base+'docs/FIGURE_ATLAS.html'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const links = await page.getByRole('table').locator('tbody a[href$=".webp"]').evaluateAll(rows=>rows.map(a=>a.href));
    assert.equal(links.length,16);
    for (const url of links) assert.equal((await page.request.head(url)).status(),200,url);
    assert.deepEqual(errors,[]);
    console.log(layout+': production root, keyboard navigation, all chapters and figures, and cross-tool/Atlas routing passed');
  } catch(error) {
    if (screenshots) await page.screenshot({path:path.join(screenshots,'failure-story-'+layout+'.png')}).catch(()=>{});
    throw error;
  } finally { await page.close(); }
}

async function offline(browser,base) {
  const page = await browser.newPage({ javaScriptEnabled:false, reducedMotion:'reduce' });
  try {
    await page.goto(base);
    await page.getByRole('link',{name:'Open the portfolio'}).click();
    assert.ok(await page.getByRole('link',{name:'Read the Original Paper'}).isVisible());
    await page.getByRole('navigation',{name:'Portfolio',exact:true}).getByRole('link',{name:'Figure Atlas'}).click();
    await page.waitForURL('**/site/#figures');
    const atlas = page.locator('#figures a[href$="FIGURE_ATLAS.html"]').first();
    await atlas.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/docs/FIGURE_ATLAS.html');
    assert.equal(await page.getByRole('table').locator('tbody a[href$=".webp"]').count(),16);
  } finally { await page.close(); }
}
async function main() {
  if (screenshots) await fs.mkdir(screenshots,{recursive:true});
  const {server,base} = await startPreview();
  let browser;
  try {
    browser = await chromium.launch({ executablePath:process.env.CHROME_BIN,headless:true });
    await offline(browser,base);
    await exercise(browser,base,'desktop',{width:1280,height:940});
    await exercise(browser,base,'mobile',{width:390,height:844});
  } finally { await browser?.close(); server.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
