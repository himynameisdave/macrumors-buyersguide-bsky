import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import cheerio from 'cheerio';
import deepEqual from 'deep-equal';
import postUpdateToBlueSky from '../bsky-bot/index.js';
import { Category, BuyStatus } from '../enums.js';

const FILENAME = 'buyers-guide.json';

const classNameToBuyStatus: Record<string, BuyStatus> = {
  green: BuyStatus.BuyNow,
  yellow: BuyStatus.Caution,
  neutral: BuyStatus.Neutral,
  red: BuyStatus.DontBuy,
};

type Entry = {
  category: Category;
  buyStatus: BuyStatus;
  productId: string; // This is just the shortname used in the URL
  productName: string;
  productImageURL: string;
};

export type UpdatedEntry = {
  entry: Entry;
  prevStatus?: BuyStatus;
  nextStatus: BuyStatus;
};

const READY_SELECTOR = '#pane-iphone ul'; // Real-content signal: present once Cloudflare clears.
const NAV_TIMEOUT_MS = 30_000;
const CLEAR_TIMEOUT_MS = 45_000; // Budget for the Cloudflare challenge to clear.

/**
 * Loads a URL in a real (headless) browser so Cloudflare's managed challenge
 * can run its JS and grant a `cf_clearance` cookie, then parses the resulting
 * HTML with cheerio. A bare HTTP GET only ever sees the "Just a moment…"
 * interstitial, so a browser engine is required.
 *
 * Throws if the challenge doesn't clear, so the run fails loudly instead of
 * writing the interstitial page as scraped data.
 *
 * @param {string} url - The given URL
 */
async function fetchPageAndParse(url: string): Promise<cheerio.Root> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox', // Required on the GitHub Actions ubuntu runner.
      '--disable-dev-shm-usage', // Avoid /dev/shm exhaustion crashes in CI.
    ],
  });
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
        + '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: {
        width: 1280,
        height: 800,
      },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
    });
    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT_MS,
    });
    try {
      await page.waitForSelector(READY_SELECTOR, {
        state: 'attached',
        timeout: CLEAR_TIMEOUT_MS,
      });
    } catch {
      const title = await page.title().catch(() => '');
      throw new Error(
        `Cloudflare challenge did not clear in ${CLEAR_TIMEOUT_MS}ms `
        + `(last title: "${title}"). Likely a datacenter-IP block. Aborting so `
        + 'no stale data is committed.',
      );
    }
    return cheerio.load(await page.content());
  } finally {
    await browser.close();
  }
}

const URL = 'https://buyersguide.macrumors.com/';
const entries: Entry[] = [];

const $ = await fetchPageAndParse(URL);

for await (const category of Object.values(Category)) {
  const $list = $(`#pane-${category} ul`);
  $list.children().each((_index, element) => {
    const className = $(element).attr('class') as string;
    const buyStatus = classNameToBuyStatus[className];
    const productId = cheerio.load(element)('a').attr('href')?.replace('#', '') ?? 'unknown';
    const productName = $(element).text();
    const productImageURL = cheerio.load(element)('img').attr('src') ?? '';
    entries.push({
      category,
      buyStatus,
      productId,
      productName,
      productImageURL,
    });
  });
}

const entryMapped = (entry: Entry): [Entry['productId'], Entry['buyStatus']] => ([
  entry.productId,
  entry.buyStatus,
]);

//  Pass in the entries and this will check if they are different
async function comparePrevious(updatedEntries: Entry[]): Promise<UpdatedEntry[] | undefined> {
  try {
    // eslint-disable-next-line unicorn/prefer-json-parse-buffer -- Might turn this rule off totally.
    const currentEntries = JSON.parse(await fs.readFile(FILENAME, 'utf8')) as Entry[];
    if (!deepEqual(currentEntries, updatedEntries)) {
      console.log('✨ Changes detected!');
      const current = Object.fromEntries(currentEntries.map(entryMapped));
      return updatedEntries
        .filter(entry => current[entry.productId] !== entry.buyStatus)
        .map(entry => ({
          entry,
          prevStatus: current[entry.productId],
          nextStatus: entry.buyStatus,
        }));
    }
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

const updatedEntries = (await comparePrevious(entries)) ?? [];

// eslint-disable-next-line n/no-process-env -- Opt-out switch for priming a fresh baseline.
const skipSkeet = (process.env.SKIP_SKEET ?? '') !== '';

if (updatedEntries.length > 0 && skipSkeet) {
  //  Priming a fresh baseline (e.g. after a site redesign): record the data
  //  without skeeting the backlog of differences.
  // eslint-disable-next-line no-console
  console.log(`🙊 SKIP_SKEET set — recording ${updatedEntries.length} change(s) without posting.`);
} else if (updatedEntries.length > 0) {
  //  We can start them all concurrently because they are throttled anyway.
  await Promise.all(updatedEntries.map(postUpdateToBlueSky));
  // eslint-disable-next-line no-console
  console.log('🦋 The people of Bksy have been informed!');
} else {
  // eslint-disable-next-line no-console
  console.log('🌈 No changes detected!');
}

//  Finally, we can write to file
//  The next part of the GitHub Action will commit and push the changes.
await fs.writeFile(FILENAME, JSON.stringify(entries, null, 2), 'utf8');
