import fs from 'node:fs/promises';
import axios from 'axios';
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
  prevStatus: BuyStatus;
  nextStatus: BuyStatus;
};

/**
 * Takes any web URL, fetches it and parses it with cheerio.
 * Assumes HTML is returned from the endpoint.
 *
 * @param {string} url - The given URL
 */
async function fetchPageAndParse(url: string): Promise<cheerio.Root> {
  const { data } = await axios.get<string>(url);
  return cheerio.load(data);
}

const URL = `https://buyersguide.macrumors.com/`;
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

if (updatedEntries.length > 0) {
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
