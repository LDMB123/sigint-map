import PQueue from "p-queue";

// Rate limiter configuration
// Be respectful to the original site - max 2 concurrent, 5 requests per 10 seconds
export const createRateLimiter = () => {
  return new PQueue({
    concurrency: 2,
    intervalCap: 5,
    interval: 10000, // 10 seconds
  });
};

// Delay utility
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Random delay between min and max milliseconds
export const randomDelay = (min: number, max: number) =>
  delay(Math.floor(Math.random() * (max - min + 1)) + min);
