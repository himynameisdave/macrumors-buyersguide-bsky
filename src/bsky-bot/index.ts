/* eslint-disable no-console */
import { RichText, type AppBskyFeedPost, type BskyAgent } from '@atproto/api';
import loginAndGetAgent from './agent.js';
import pThrottle from 'p-throttle';
// import strLength from 'string-length';
import { BuyStatus, Category } from '../enums.js';
import type { UpdatedEntry } from '../scraper/index.js';

// eslint-disable-next-line @typescript-eslint/sort-type-constituents -- This is silly because they are emoji
const buyStatusToEmojiMap: Record<BuyStatus, '🟢' | '🟡' | '⚪️' | '🔴'> = {
  [BuyStatus.BuyNow]: '🟢',
  [BuyStatus.Caution]: '🟡',
  [BuyStatus.Neutral]: '⚪️',
  [BuyStatus.DontBuy]: '🔴',
};

const buyStatusToReadable: Record<BuyStatus, string> = {
  [BuyStatus.BuyNow]: '🟢 BUY NOW 🟢',
  [BuyStatus.Caution]: '🟡 CAUTION 🟡',
  [BuyStatus.Neutral]: '⚪️ NEUTRAL ⚪️',
  [BuyStatus.DontBuy]: '🔴 DON\'T BUY 🔴',
};

const categoryToEmojiMap: Record<Category, string> = {
  [Category.IOs]: '📱',
  [Category.Mac]: '💻',
  [Category.Music]: '🎧',
  [Category.Other]: '⌚',
};

const getEmojiAndReadable = (status: BuyStatus): [string, string] => [buyStatusToEmojiMap[status], buyStatusToReadable[status]];

async function buildPost(agent: BskyAgent, {
  entry,
  prevStatus,
  nextStatus,
}: UpdatedEntry): Promise<AppBskyFeedPost.Record> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_previousEmoji, previousText] = getEmojiAndReadable(prevStatus);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_nextEmoji, nextText] = getEmojiAndReadable(nextStatus);
  const updateMessage = `${categoryToEmojiMap[entry.category]} ${entry.productName} went from\n${previousText}\n     to\n${nextText}!`;
  const url = `https://buyersguide.macrumors.com/#${entry.category}`;
  const text = `${updateMessage}

Read more: ${url}`;
  const richText = new RichText({ text });
  //  This will make the URL into an actual link
  await richText.detectFacets(agent);

  return {
    $type: 'app.bsky.feed.post',
    text: richText.text,
    facets: richText.facets,
    createdAt: new Date().toISOString(),
  };
}

const throttle = pThrottle({
  limit: 1,
  interval: 1000,
});

async function postUpdateToBlueSky({
  entry,
  prevStatus,
  nextStatus,
}: UpdatedEntry): Promise<void> {
  const agent = await loginAndGetAgent();
  const post = await buildPost(agent, {
    entry,
    prevStatus,
    nextStatus,
  });
  console.log('🚀 Posting...');
  await agent.post(post);
  console.log(post.text);
}

export default throttle(postUpdateToBlueSky);
