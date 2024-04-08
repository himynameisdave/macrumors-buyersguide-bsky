/* eslint-disable no-console */
import { RichText, type AppBskyFeedPost } from '@atproto/api';
import loginAndGetAgent from './agent.js';
import pThrottle from 'p-throttle';
// import strLength from 'string-length';
import { BuyStatus } from '../enums.js';
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

const getEmojiAndReadable = (status: BuyStatus): [string, string] => [buyStatusToEmojiMap[status], buyStatusToReadable[status]];

function buildPost({
  entry,
  prevStatus,
  nextStatus,
}: UpdatedEntry): AppBskyFeedPost.Record {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_previousEmoji, previousText] = getEmojiAndReadable(prevStatus);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_nextEmoji, nextText] = getEmojiAndReadable(nextStatus);
  const updateMessage = `🛒 ${entry.productName} went from\n${previousText}\nto\n${nextText}!`;
  const url = `https://buyersguide.macrumors.com/#${entry.category}`;
  const text = `${updateMessage}

Read more: ${url}`;
  const richText = new RichText({ text });

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
  const post = buildPost({
    entry,
    prevStatus,
    nextStatus,
  });
  const agent = await loginAndGetAgent();
  console.log('🚀 Posting...');
  await agent.post(post);
  console.log(post.text);
}

export default throttle(postUpdateToBlueSky);
