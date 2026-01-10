import fetch from 'node-fetch';
import NewsSource from '../models/NewsSource.js';

/**
 * Base News Fetcher Tool
 * Provides common functionality for all news fetching tools
 */
export class BaseNewsFetcher {
  constructor(sourceId) {
    this.sourceId = sourceId;
    this.source = null;
  }

  async initialize() {
    if (!this.source) {
      this.source = await NewsSource.findById(this.sourceId);
      if (!this.source) {
        throw new Error(`News source with ID ${this.sourceId} not found`);
      }
    }
    return this.source;
  }

  async makeRequest(endpoint, options = {}) {
    const source = await this.initialize();

    // Check rate limits
    if (source.rateLimit.lastRequest) {
      const timeSinceLastRequest = Date.now() - source.rateLimit.lastRequest.getTime();
      const minInterval = (source.rateLimit.period * 60 * 1000) / source.rateLimit.requests;

      if (timeSinceLastRequest < minInterval) {
        throw new Error(`Rate limit exceeded for ${source.name}. Wait ${Math.ceil((minInterval - timeSinceLastRequest) / 1000)} seconds.`);
      }
    }

    const headers = {
      'User-Agent': 'UPSC-Mentor-Current-Affairs-Agent/1.0',
      ...Object.fromEntries(source.headers),
      ...options.headers
    };

    const requestOptions = {
      method: source.fetchConfig.method,
      headers,
      timeout: source.fetchConfig.timeout,
      ...options
    };

    // Add API key if configured
    if (source.apiKey) {
      if (endpoint.includes('?')) {
        endpoint += `&apiKey=${source.apiKey}`;
      } else {
        endpoint += `?apiKey=${source.apiKey}`;
      }
    }

    const fullUrl = endpoint.startsWith('http') ? endpoint : `${source.apiEndpoint}${endpoint}`;

    try {
      const response = await fetch(fullUrl, requestOptions);

      // Update rate limit tracking
      await NewsSource.findByIdAndUpdate(this.sourceId, {
        'rateLimit.lastRequest': new Date(),
        $inc: { successCount: 1 }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Update error count
      await NewsSource.findByIdAndUpdate(this.sourceId, {
        $inc: { errorCount: 1 }
      });

      throw error;
    }
  }

  async retryOperation(operation, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  }
}

/**
 * NewsAPI.org Fetcher
 * Fetches news from NewsAPI.org
 */
export class NewsAPIFetcher extends BaseNewsFetcher {
  async fetchCurrentAffairs(dateFrom, dateTo, keywords = []) {
    return this.retryOperation(async () => {
      const params = new URLSearchParams({
        q: keywords.length > 0 ? keywords.join(' OR ') : 'India politics economy OR government policy OR international relations',
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0],
        language: 'en',
        sortBy: 'relevancy',
        pageSize: '100'
      });

      const data = await this.makeRequest(`?${params}`);

      return data.articles.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        source: article.source.name,
        publishedAt: new Date(article.publishedAt),
        author: article.author,
        urlToImage: article.urlToImage
      }));
    });
  }
}

/**
 * The Hindu News Fetcher
 * Fetches articles from The Hindu RSS feeds
 */
export class TheHinduFetcher extends BaseNewsFetcher {
  async fetchCurrentAffairs(dateFrom, dateTo, keywords = []) {
    return this.retryOperation(async () => {
      // The Hindu doesn't have a direct API, so we'll use RSS parsing
      const rssUrl = 'https://www.thehindu.com/news/national/feeder/default.rss';
      const response = await this.makeRequest('', {
        method: 'GET',
        headers: { 'Accept': 'application/rss+xml' }
      });

      // Parse RSS (simplified - in real implementation you'd use a proper RSS parser)
      const articles = this.parseRSSResponse(response);

      return articles.filter(article =>
        article.publishedAt >= dateFrom &&
        article.publishedAt <= dateTo &&
        this.matchesKeywords(article.title + ' ' + article.description, keywords)
      );
    });
  }

  parseRSSResponse(rssData) {
    // Simplified RSS parsing - in production, use a proper RSS parser
    const items = rssData.match(/<item>(.*?)<\/item>/gs) || [];
    return items.map(item => {
      const title = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const description = item.match(/<description>(.*?)<\/description>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      return {
        title: this.stripHtml(title),
        description: this.stripHtml(description),
        content: this.stripHtml(description),
        url: link,
        source: 'The Hindu',
        publishedAt: new Date(pubDate),
        author: null
      };
    });
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  matchesKeywords(text, keywords) {
    if (keywords.length === 0) return true;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );
  }
}

/**
 * Government of India Press Releases Fetcher
 * Fetches press releases from PIB (Press Information Bureau)
 */
export class PIBFetcher extends BaseNewsFetcher {
  async fetchCurrentAffairs(dateFrom, dateTo, keywords = []) {
    return this.retryOperation(async () => {
      // PIB API or scraping - simplified implementation
      const baseUrl = 'https://pib.gov.in/PressReleasePage.aspx';

      // In real implementation, this would scrape or use official APIs
      const mockReleases = [
        {
          title: 'Government announces new agricultural policy',
          description: 'Ministry of Agriculture releases comprehensive policy framework...',
          content: 'Full press release content here...',
          url: 'https://pib.gov.in/pressrelease/2024/01/agriculture-policy',
          source: 'Press Information Bureau',
          publishedAt: new Date(),
          author: 'Ministry of Agriculture'
        }
      ];

      return mockReleases.filter(release =>
        release.publishedAt >= dateFrom &&
        release.publishedAt <= dateTo &&
        this.matchesKeywords(release.title + ' ' + release.description, keywords)
      );
    });
  }

  matchesKeywords(text, keywords) {
    if (keywords.length === 0) return true;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );
  }
}

/**
 * Indian Express Editorial Fetcher
 */
export class IndianExpressFetcher extends BaseNewsFetcher {
  async fetchCurrentAffairs(dateFrom, dateTo, keywords = []) {
    return this.retryOperation(async () => {
      const params = new URLSearchParams({
        section: 'opinion',
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0],
        limit: '50'
      });

      // Mock implementation - in real scenario would use IE API
      const mockArticles = [
        {
          title: 'The future of India-China relations',
          description: 'Editorial analysis of recent developments...',
          content: 'Detailed editorial content...',
          url: 'https://indianexpress.com/article/opinion/editorials/india-china-relations/',
          source: 'Indian Express',
          publishedAt: new Date(),
          author: 'Editorial Board'
        }
      ];

      return mockArticles.filter(article =>
        article.publishedAt >= dateFrom &&
        article.publishedAt <= dateTo &&
        this.matchesKeywords(article.title + ' ' + article.description, keywords)
      );
    });
  }

  matchesKeywords(text, keywords) {
    if (keywords.length === 0) return true;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );
  }
}
