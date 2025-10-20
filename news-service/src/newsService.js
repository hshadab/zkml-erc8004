import { NewsFetcher } from './fetcher.js';

/**
 * News service wrapper for automated trading
 * Provides simple function interface for fetching CoinDesk news
 */

const fetcher = new NewsFetcher();

/**
 * Fetch latest news from CoinDesk RSS feed
 * @returns {Array} Array of news articles with { title, source, pubDate, link }
 */
export async function fetchCoinDeskNews() {
  const items = await fetcher.fetchLatestNews();

  // Convert to format expected by polygonAutomated.js
  return items.map(item => ({
    title: item.headline,
    source: item.source,
    pubDate: item.timestamp,
    link: item.url,
    reliability: item.reliability
  }));
}

// Export fetcher instance for advanced usage
export { fetcher };
