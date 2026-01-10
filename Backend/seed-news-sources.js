import mongoose from 'mongoose';
import NewsSource from './src/models/NewsSource.js';

const seedNewsSources = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/upsc-mentor');

    console.log('Connected to database');

    // Clear existing sources
    await NewsSource.deleteMany({});
    console.log('Cleared existing news sources');

    // Seed news sources
    const sources = [
      {
        name: 'NewsAPI.org',
        url: 'https://newsapi.org',
        type: 'newsapi',
        category: 'national',
        reliabilityScore: 85,
        apiEndpoint: 'https://newsapi.org/v2/everything',
        apiKey: process.env.NEWSAPI_KEY || 'demo-key',
        isActive: true,
        rateLimit: {
          requests: 100,
          period: 60
        },
        fetchConfig: {
          timeout: 30000,
          retries: 3,
          retryDelay: 1000
        }
      },
      {
        name: 'The Hindu',
        url: 'https://www.thehindu.com',
        type: 'thehindu',
        category: 'national',
        reliabilityScore: 90,
        apiEndpoint: 'https://www.thehindu.com',
        isActive: true,
        rateLimit: {
          requests: 10,
          period: 60
        },
        fetchConfig: {
          timeout: 30000,
          retries: 3,
          retryDelay: 1000
        }
      },
      {
        name: 'Press Information Bureau',
        url: 'https://pib.gov.in',
        type: 'pib',
        category: 'government',
        reliabilityScore: 95,
        apiEndpoint: 'https://pib.gov.in',
        isActive: true,
        rateLimit: {
          requests: 30,
          period: 60
        },
        fetchConfig: {
          timeout: 30000,
          retries: 3,
          retryDelay: 1000
        }
      }
    ];

    for (const source of sources) {
      await NewsSource.create(source);
      console.log(`Created source: ${source.name}`);
    }

    console.log('News sources seeded successfully!');
    console.log(`Total sources: ${sources.length}`);

  } catch (error) {
    console.error('Error seeding news sources:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedNewsSources();
