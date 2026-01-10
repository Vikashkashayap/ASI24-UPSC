import cron from 'node-cron';
import CurrentAffairsResearchAgent from '../agents/currentAffairsResearchAgent.js';
import ModelDrivenTrendingAgent from '../agents/modelDrivenTrendingAgent.js';
import ResearchRun from '../models/ResearchRun.js';

/**
 * Scheduler Service for automated current affairs research
 */
export class SchedulerService {
  constructor() {
    this.traditionalAgent = new CurrentAffairsResearchAgent();
    this.modelDrivenAgent = new ModelDrivenTrendingAgent();
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the scheduler service
   */
  async initialize() {
    console.log('🔄 Initializing Current Affairs Research Scheduler...');

    // Clean up any stuck running jobs on startup
    await this.cleanupStuckJobs();

    // Schedule default research runs
    this.scheduleDailyResearch();
    this.scheduleWeeklyDeepDive();

    // Schedule model-driven research (primary method)
    this.scheduleDailyModelDrivenResearch();

    console.log('✅ Scheduler initialized successfully');
  }

  /**
   * Schedule daily current affairs research
   * Runs every day at 6 AM IST (12:30 AM UTC)
   */
  scheduleDailyResearch() {
    const jobName = 'daily-research';

    // Stop existing job if running
    if (this.jobs.has(jobName)) {
      this.jobs.get(jobName).stop();
    }

    const job = cron.schedule('30 0 * * *', async () => {
      // 12:30 AM UTC = 6:00 AM IST
      await this.executeScheduledResearch({
        type: 'scheduled',
        name: 'Daily Current Affairs Research',
        config: {
          dateRange: {
            from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            to: new Date()
          },
          minRelevanceScore: 25,
          maxTopics: 15,
          minTopics: 4,
          keywords: [] // Let the agent determine trending topics
        }
      });
    }, {
      timezone: 'UTC'
    });

    this.jobs.set(jobName, job);
    console.log('📅 Daily research scheduled for 6:00 AM IST (12:30 AM UTC)');
  }

  /**
   * Schedule weekly deep-dive research
   * Runs every Sunday at 8 AM IST (2:30 AM UTC)
   */
  scheduleWeeklyDeepDive() {
    const jobName = 'weekly-deepdive';

    if (this.jobs.has(jobName)) {
      this.jobs.get(jobName).stop();
    }

    const job = cron.schedule('30 2 * * 0', async () => {
      // 2:30 AM UTC on Sunday = 8:00 AM IST on Sunday
      await this.executeScheduledResearch({
        type: 'scheduled',
        name: 'Weekly Deep-Dive Research',
        config: {
          dateRange: {
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            to: new Date()
          },
          minRelevanceScore: 35,
          maxTopics: 20,
          categories: [], // All categories
          generateAnalysis: true
        }
      });
    }, {
      timezone: 'UTC'
    });

    this.jobs.set(jobName, job);
    console.log('📅 Weekly deep-dive research scheduled for Sunday 8:00 AM IST (2:30 AM UTC)');
  }

  /**
   * Schedule daily model-driven current affairs generation
   * This is the PRIMARY method using LLM reasoning only
   * Runs every day at 7 AM IST (1:30 AM UTC)
   */
  scheduleDailyModelDrivenResearch() {
    const jobName = 'daily-model-driven';

    // Stop existing job if running
    if (this.jobs.has(jobName)) {
      this.jobs.get(jobName).stop();
    }

    const job = cron.schedule('30 1 * * *', async () => {
      // 1:30 AM UTC = 7:00 AM IST
      await this.executeModelDrivenResearch({
        type: 'scheduled',
        name: 'Daily Model-Driven Current Affairs',
        config: {
          targetTopics: 7,
          maxTopics: 10,
          minTopics: 5,
          updateDatabase: true,
          includeDisclaimer: true,
          ethicalSafeguards: true,
          temperature: 0.3,
          maxTokens: 6000
        }
      });
    }, {
      timezone: 'UTC'
    });

    this.jobs.set(jobName, job);
    console.log('🤖 Daily model-driven research scheduled for 7:00 AM IST (1:30 AM UTC)');
  }

  /**
   * Execute scheduled research with proper error handling and logging
   * @param {Object} options - Research options
   */
  async executeScheduledResearch(options) {
    if (this.isRunning) {
      console.log('⚠️  Scheduled research already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log(`🚀 Starting ${options.name} at ${startTime.toISOString()}`);

      const result = await this.agent.executeResearch({
        ...options.config,
        type: options.type,
        triggeredBy: 'scheduler'
      });

      const duration = Date.now() - startTime;
      console.log(`✅ ${options.name} completed successfully in ${duration}ms`);
      console.log(`📊 Found ${result.summary.trendingTopicsDetected} trending topics`);

      // Log success
      await this.logScheduledRun(options.name, 'success', {
        duration,
        topicsFound: result.summary.trendingTopicsDetected,
        startTime,
        endTime: new Date()
      });

    } catch (error) {
      console.error(`❌ ${options.name} failed:`, error.message);

      // Log failure
      await this.logScheduledRun(options.name, 'failed', {
        error: error.message,
        startTime,
        endTime: new Date()
      });

      // Send alert (in production, this could be email/SMS notification)
      await this.sendAlert(`Scheduled research failed: ${error.message}`);

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute model-driven research with proper error handling and logging
   * @param {Object} options - Research options
   */
  async executeModelDrivenResearch(options) {
    if (this.isRunning) {
      console.log('⚠️  Model-driven research already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log(`🚀 Starting ${options.name} at ${startTime.toISOString()}`);
      console.log('🤖 Using model-driven generation (LLM reasoning only, no external data)');

      const result = await this.modelDrivenAgent.generateDailyTrendingTopics(options.config);

      const duration = Date.now() - startTime;
      console.log(`✅ ${options.name} completed successfully in ${duration}ms`);
      console.log(`📊 Generated ${result.summary.topicsGenerated} model-driven topics`);

      // Log success
      await this.logModelDrivenRun(options.name, 'success', {
        duration,
        topicsGenerated: result.summary.topicsGenerated,
        topicsSaved: result.summary.databaseUpdates.created + result.summary.databaseUpdates.updated,
        startTime,
        endTime: new Date()
      });

    } catch (error) {
      console.error(`❌ ${options.name} failed:`, error.message);

      // Log failure
      await this.logModelDrivenRun(options.name, 'failed', {
        error: error.message,
        startTime,
        endTime: new Date()
      });

      // Send alert
      await this.sendAlert(`Model-driven research failed: ${error.message}`);

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log scheduled run results
   * @param {string} name - Research name
   * @param {string} status - Success or failed
   * @param {Object} details - Additional details
   */
  async logScheduledRun(name, status, details) {
    try {
      await ResearchRun.create({
        runId: `scheduled-${Date.now()}`,
        status: status === 'success' ? 'completed' : 'failed',
        type: 'scheduled',
        triggeredBy: 'scheduler',
        startTime: details.startTime,
        endTime: details.endTime,
        duration: details.endTime - details.startTime,
        results: {
          topicsFound: details.topicsFound || 0,
          topicsProcessed: details.topicsFound || 0,
          topicsUpdated: details.topicsFound || 0,
          newTopics: details.topicsFound || 0
        },
        logs: [{
          level: status === 'success' ? 'info' : 'error',
          message: `${name}: ${status === 'success' ? 'Completed successfully' : 'Failed - ' + details.error}`,
          timestamp: new Date(),
          step: 'scheduled_run'
        }]
      });
    } catch (logError) {
      console.error('Failed to log scheduled run:', logError);
    }
  }

  /**
   * Log model-driven run results
   * @param {string} name - Research name
   * @param {string} status - Success or failed
   * @param {Object} details - Additional details
   */
  async logModelDrivenRun(name, status, details) {
    try {
      await ResearchRun.create({
        runId: `model-driven-${Date.now()}`,
        status: status === 'success' ? 'completed' : 'failed',
        type: 'model-driven',
        triggeredBy: 'scheduler',
        startTime: details.startTime,
        endTime: details.endTime,
        duration: details.endTime - details.startTime,
        results: {
          topicsFound: details.topicsGenerated || 0,
          topicsProcessed: details.topicsGenerated || 0,
          topicsUpdated: details.topicsSaved || 0,
          newTopics: details.topicsSaved || 0
        },
        logs: [{
          level: status === 'success' ? 'info' : 'error',
          message: `${name}: ${status === 'success' ? 'Completed successfully' : 'Failed - ' + details.error}`,
          timestamp: new Date(),
          step: 'model_driven_run'
        }]
      });
    } catch (logError) {
      console.error('Failed to log model-driven run:', logError);
    }
  }

  /**
   * Send alert for failed runs (placeholder for notification system)
   * @param {string} message - Alert message
   */
  async sendAlert(message) {
    // In production, integrate with email/SMS services
    console.error('🚨 ALERT:', message);

    // TODO: Implement actual notification system
    // await emailService.sendAlert(process.env.ADMIN_EMAIL, 'Research Failure Alert', message);
    // await smsService.sendSMS(process.env.ADMIN_PHONE, message);
  }

  /**
   * Clean up stuck jobs that are marked as running but not actually running
   */
  async cleanupStuckJobs() {
    try {
      const stuckJobs = await ResearchRun.find({
        status: 'running',
        updatedAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Older than 2 hours
      });

      if (stuckJobs.length > 0) {
        console.log(`🧹 Found ${stuckJobs.length} stuck jobs, cleaning up...`);

        await ResearchRun.updateMany(
          {
            status: 'running',
            updatedAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
          },
          {
            status: 'failed',
            endTime: new Date(),
            $push: {
              errors: {
                step: 'cleanup',
                error: 'Job marked as failed due to timeout',
                timestamp: new Date()
              }
            }
          }
        );

        console.log('✅ Stuck jobs cleaned up');
      }
    } catch (error) {
      console.error('Error cleaning up stuck jobs:', error);
    }
  }

  /**
   * Manually trigger a research run
   * @param {Object} config - Research configuration
   * @returns {Promise<Object>} - Research results
   */
  async triggerManualResearch(config = {}) {
    return this.executeScheduledResearch({
      type: 'manual',
      name: 'Manual Research Trigger',
      config: {
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date()
        },
        minRelevanceScore: 30,
        maxTopics: 10,
        ...config
      }
    });
  }

  /**
   * Manually trigger a model-driven research run
   * @param {Object} config - Research configuration
   * @returns {Promise<Object>} - Research results
   */
  async triggerManualModelDrivenResearch(config = {}) {
    return this.executeModelDrivenResearch({
      type: 'manual',
      name: 'Manual Model-Driven Research Trigger',
      config: {
        targetTopics: 7,
        maxTopics: 10,
        minTopics: 5,
        updateDatabase: true,
        includeDisclaimer: true,
        ethicalSafeguards: true,
        temperature: 0.3,
        maxTokens: 6000,
        ...config
      }
    });
  }

  /**
   * Get scheduler status
   * @returns {Object} - Scheduler status
   */
  getStatus() {
    const jobs = Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.running,
      scheduled: job.scheduled
    }));

    return {
      isRunning: this.isRunning,
      jobs,
      nextRuns: this.getNextRunTimes()
    };
  }

  /**
   * Get next run times for all scheduled jobs
   * @returns {Object} - Next run times
   */
  getNextRunTimes() {
    const nextRuns = {};

    // Cron doesn't provide easy access to next run times,
    // so we'll estimate based on the schedule
    const now = new Date();

    // Daily research: 12:30 AM UTC next day
    const nextDaily = new Date(now);
    nextDaily.setDate(nextDaily.getDate() + 1);
    nextDaily.setHours(0, 30, 0, 0);
    nextRuns['daily-research'] = nextDaily;

    // Weekly deep-dive: Next Sunday 2:30 AM UTC
    const nextWeekly = new Date(now);
    const daysUntilSunday = (7 - nextWeekly.getDay()) % 7 || 7;
    nextWeekly.setDate(nextWeekly.getDate() + daysUntilSunday);
    nextWeekly.setHours(2, 30, 0, 0);
    nextRuns['weekly-deepdive'] = nextWeekly;

    // Model-driven research: 1:30 AM UTC next day
    const nextModelDriven = new Date(now);
    nextModelDriven.setDate(nextModelDriven.getDate() + 1);
    nextModelDriven.setHours(1, 30, 0, 0);
    nextRuns['daily-model-driven'] = nextModelDriven;

    return nextRuns;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    console.log('🛑 Stopping all scheduled jobs...');

    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`⏹️  Stopped job: ${name}`);
    }

    this.jobs.clear();
    console.log('✅ All jobs stopped');
  }

  /**
   * Restart scheduler with current configuration
   */
  async restart() {
    console.log('🔄 Restarting scheduler...');
    this.stopAll();
    await this.initialize();
  }
}

// Export singleton instance
const schedulerService = new SchedulerService();

export default schedulerService;
