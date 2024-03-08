import fs from 'node:fs/promises';
import axios from 'axios';
import cheerio from 'cheerio';

enum Category {
  IOs = 'ios',
  Mac = 'mac',
  Music = 'music',
  Other = 'other',
}

enum BuyStatus {
  BuyNow = 'buyNow',
  Caution = 'caution',
  Neutral = 'neutral',
  DontBuy = 'DontBuy',
}

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

// Write to file
await fs.writeFile('buyers-guide.json', JSON.stringify(entries, null, 2), 'utf8');
