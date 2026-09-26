import { removeE2EData, resetRateLimits } from './db';

export default async function globalTeardown() {
  await removeE2EData();
  await resetRateLimits();
}
