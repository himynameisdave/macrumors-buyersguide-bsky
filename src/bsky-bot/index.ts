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

function buildMessage({
  entry, prevStatus, nextStatus,
}: UpdatedEntry): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_previousEmoji, previousText] = getEmojiAndReadable(prevStatus);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_nextEmoji, nextText] = getEmojiAndReadable(nextStatus);
  const updateMessage = `🛒 ${entry.productName} went from ${previousText} to ${nextText}!!!`;
  const message = `${updateMessage}

Read more: https://buyersguide.macrumors.com/#${entry.category}`;
  return message;
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
  const text = buildMessage({
    entry,
    prevStatus,
    nextStatus,
  });
  const agent = await loginAndGetAgent();
  console.log('🚀 Posting...');
  await agent.post({
    text,
  });
  console.log(text);
}

export default throttle(postUpdateToBlueSky);
