const { chromium } = require('playwright-core');
const cheerio = require('cheerio');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://theultimateofallages.com');
  const html = await page.content();
  const $ = cheerio.load(html);
  
  const links = $('a[href*="chapter"]').slice(0, 20).map((i, el) => {
    return $(el).text().trim() + ' -> ' + $(el).attr('href');
  }).get();
  
  console.log(links.join('\n'));
  await browser.close();
})();
