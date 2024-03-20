/* eslint-disable n/no-process-env */
import { BskyAgent } from '@atproto/api';
import * as dotenv from 'dotenv';

dotenv.config();

const agent = new BskyAgent({
  service: 'https://bsky.social',
});

export default async function loginAndGetAgent(): Promise<BskyAgent> {
  await agent.login({
    identifier: process.env.BLUESKY_USERNAME ?? '',
    password: process.env.BLUESKY_PASSWORD ?? '',
  });
  return agent;
}
