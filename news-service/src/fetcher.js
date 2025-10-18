import Parser from 'rss-parser';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * News fetcher service
 * Fetches news from CoinDesk RSS feed
 */
export class NewsFetcher {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['description', 'content', 'contentSnippet']
      }
    });
    this.lastFetchTime = null;
    this.seenHeadlines = new Set();
  }

  /**
   * Fetch latest news from CoinDesk RSS
   * @returns {Array} Array of news items
   */
  async fetchLatestNews() {
    try {
      logger.info('Fetching latest news from CoinDesk RSS');

      const feed = await this.parser.parseURL(config.coinDeskRssUrl);

      logger.info(`Fetched ${feed.items.length} items from RSS feed`);

      // Filter for new items
      const now = new Date();
      const newItems = feed.items.filter(item => {
        const pubDate = new Date(item.pubDate || item.isoDate);

        // Skip if we've seen this headline before
        if (this.seenHeadlines.has(item.title)) {
          return false;
        }

        // Skip if too old (only process items from last hour on first run)
        if (!this.lastFetchTime) {
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          if (pubDate < oneHourAgo) {
            return false;
          }
        } else {
          // Skip if older than last fetch
          if (pubDate <= this.lastFetchTime) {
            return false;
          }
        }

        return true;
      });

      logger.info(`Found ${newItems.length} new items`);

      // Convert to our format
      const newsItems = newItems.map(item => ({
        headline: item.title,
        source: 'CoinDesk',
        timestamp: item.pubDate || item.isoDate,
        url: item.link,
        reliability: 0.95  // CoinDesk is highly reliable
      }));

      // Mark as seen
      newsItems.forEach(item => {
        this.seenHeadlines.add(item.headline);
      });

      // Update last fetch time
      this.lastFetchTime = now;

      // Limit to max per cycle
      if (newsItems.length > config.maxClassificationsPerCycle) {
        logger.info(`Limiting to ${config.maxClassificationsPerCycle} items per cycle`);
        return newsItems.slice(0, config.maxClassificationsPerCycle);
      }

      return newsItems;

    } catch (error) {
      logger.error('Error fetching news:', error);
      return [];
    }
  }

  /**
   * Test fetcher manually
   */
  async test() {
    logger.info('Testing news fetcher...');
    const items = await this.fetchLatestNews();

    if (items.length === 0) {
      logger.info('No new items found (this is expected if run multiple times)');
    } else {
      logger.info(`\nFetched ${items.length} items:\n`);
      items.forEach((item, i) => {
        console.log(`${i + 1}. ${item.headline}`);
        console.log(`   Source: ${item.source}, Time: ${item.timestamp}\n`);
      });
    }

    return items;
  }
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new NewsFetcher();
  await fetcher.test();
}
