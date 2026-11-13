// README ekran görüntülerini üretir: uygulamanın web derlemesini iPhone boyutunda (393×852 @3x)
// başsız Chromium'da açar, örnek veriyi yükler ve her ekranı sırayla çeker. run.sh ile çalıştırılır.
const { chromium } = require('playwright-core');
const path = require('path');
const { goals, folders, counters } = require('./seed');
const OUT = process.env.SHOTS_OUT || path.join(__dirname, 'out');
const URL = process.env.SHOTS_URL || 'http://127.0.0.1:8765/';
const only = process.argv[2];

const STATUS = (dark) => `
  <div id="fake-status" style="position:fixed;top:0;left:0;right:0;height:47px;z-index:2147483647;pointer-events:none;
       display:flex;align-items:center;justify-content:space-between;padding:6px 24px 0 26px;box-sizing:border-box;
       font:600 16px -apple-system,'Helvetica Neue',Arial,sans-serif;color:${dark ? '#fff' : '#111'}">
    <span>09:41</span>
    <span style="display:flex;gap:6px;align-items:center">
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1-1.1C13.100 1.700 10.700.700 8 .7S2.900 1.700 1 3.500l1 1.100c1.600-1.500 3.700-2.400 6-2.400zm0 3.300c1.400 0 2.700.5 3.700 1.400l1-1.100C11.400 4.600 9.800 4 8 4s-3.400.6-4.700 1.800l1 1.100C5.300 6 6.600 5.500 8 5.500zM8 8.300c-.8 0-1.500.3-2 .8l2 2.200 2-2.200c-.5-.5-1.200-.8-2-.8z" fill="currentColor"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="22" height="12" rx="3.500" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="19" height="9" rx="2" fill="currentColor"/><rect x="24" y="4" width="2" height="5" rx="1" fill="currentColor" opacity=".45"/></svg>
    </span>
  </div>`;

async function open(browser, { dark = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    locale: 'tr-TR', timezoneId: 'Europe/Istanbul', colorScheme: dark ? 'dark' : 'light',
  });
  await ctx.addInitScript(({ goals, folders, counters, dark }) => {
    if (localStorage.getItem('__seeded')) return;
    localStorage.setItem('goaltracker_v2', JSON.stringify(goals));
    localStorage.setItem('goaltracker_folders_v1', JSON.stringify(folders));
    localStorage.setItem('@counter_records_v1', JSON.stringify(counters));
    localStorage.setItem('app_language', 'tr');
    localStorage.setItem('app_theme', dark ? 'dark' : 'light');
    localStorage.setItem('__seeded', '1');
  }, { goals, folders, counters, dark });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 200)); });
  await page.goto(URL);
  await page.waitForSelector('text=Hedeflerim', { timeout: 20000 });
  await page.addStyleTag({ content: `html,body{background:${dark ? '#222222' : '#FFFFFF'} !important} #root{padding-top:47px;box-sizing:border-box} ::-webkit-scrollbar{display:none} input,textarea{outline:none !important}` });
  await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', html), STATUS(dark));
  await page.waitForTimeout(600);
  return { ctx, page };
}

const snap = async (page, name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('saved', name); };

const menu = (page) => page.mouse.click(360, 47 + 30);
const scrollTo = (page, text) => page.getByText(text, { exact: true }).first().scrollIntoViewIfNeeded();

const SHOTS = {
  async '01_home'(browser) {
    const { ctx, page } = await open(browser);
    await snap(page, '01_home');
    await ctx.close();
  },
  async '02_add_goal'(browser) {
    const { ctx, page } = await open(browser);
    await page.getByText('+ Yeni Hedef').click();
    await page.waitForTimeout(900);
    await page.getByPlaceholder('örn. IELTS sınavına hazırlan').fill('30 Gün Kitap Oku');
    await page.getByText('Eğitim', { exact: true }).last().click();
    await page.getByText('Günlük Takip', { exact: true }).click();
    await page.getByText('Gün Say', { exact: true }).click();
    await page.getByPlaceholder('örn. 30').fill('30');
    await page.getByPlaceholder('ör. sayfa, km, dakika').fill('sayfa');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await snap(page, '02_add_goal');
    await ctx.close();
  },
  async '03_detail_subtasks'(browser) {
    const { ctx, page } = await open(browser);
    await page.getByText('TURKUAVZ GCS v5.1 Arayüz Tasarımı').first().click();
    await snap(page, '03_detail_subtasks');
    // günlük
    await scrollTo(page, 'Operatör saha görüşmeleri ve bilgi mimarisi akış diyagramı çıkarıldı.');
    await snap(page, '04_detail_journal');
    await ctx.close();
  },
  async '05_daily_tracking'(browser) {
    const { ctx, page } = await open(browser);
    await page.getByText('30 Gün Kitap Oku').first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /^7\. gün/ }).click();
    await page.waitForTimeout(300);
    await page.getByText('Günlük Takip', { exact: true }).first().evaluate(el => {
      let n = el; while (n && !(n.scrollHeight > n.clientHeight + 5 && getComputedStyle(n).overflowY !== 'visible')) n = n.parentElement;
      if (n) n.scrollTop += el.getBoundingClientRect().top - 112;
    });
    await snap(page, '05_daily_tracking');
    await ctx.close();
  },
  async '06_bulk_select'(browser) {
    const { ctx, page } = await open(browser);
    await page.getByLabel('Hedef seç').click();
    await page.getByText('Haftalık 10K Koşu Antrenmanı').click();
    await page.getByText('30 Gün Kitap Oku').click();
    await snap(page, '06_bulk_select');
    await ctx.close();
  },
  async '07_side_drawer'(browser) {
    const { ctx, page } = await open(browser);
    await menu(page);
    await snap(page, '07_side_drawer');
    await page.getByText('İstatistikler', { exact: true }).click();
    await page.waitForTimeout(900);
    await snap(page, '08_stats');
    await ctx.close();
  },
  async '09_calendar'(browser) {
    const { ctx, page } = await open(browser);
    await menu(page);
    await page.waitForTimeout(500);
    await page.getByText('Takvim', { exact: true }).click();
    await page.waitForTimeout(1200);
    const d = new Date(); d.setDate(d.getDate() + 2);
    await page.getByText(String(d.getDate()), { exact: true }).first().click().catch(() => {});
    await snap(page, '09_calendar');
    await ctx.close();
  },
  async '10_dark_mode'(browser) {
    const { ctx, page } = await open(browser, { dark: true });
    await snap(page, '10_dark_mode');
    await page.getByText('30 Gün Kitap Oku').first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /^7\. gün/ }).click();
    await page.getByText('Günlük Takip', { exact: true }).first().evaluate(el => {
      let n = el; while (n && !(n.scrollHeight > n.clientHeight + 5 && getComputedStyle(n).overflowY !== 'visible')) n = n.parentElement;
      if (n) n.scrollTop += el.getBoundingClientRect().top - 112;
    });
    await snap(page, '11_daily_tracking_dark');
    await ctx.close();
  },
  async '12_pomodoro_dark'(browser) {
    const { ctx, page } = await open(browser, { dark: true });
    await menu(page);
    await page.waitForTimeout(500);
    await page.getByText('Sayaç', { exact: true }).click();
    await page.waitForTimeout(1000);
    await snap(page, '12_pomodoro_dark');
    await ctx.close();
  },
};
module.exports = { open, snap, SHOTS };

if (require.main === module) (async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, fn] of Object.entries(SHOTS)) {
    if (only && !name.includes(only)) continue;
    try { await fn(browser); } catch (e) { console.log('FAILED', name, e.message.split('\n')[0]); }
  }
  await browser.close();
})();
