import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Logging Service for Current Affairs Research Agent
 * Provides comprehensive logging, metrics, and error tracking
 */
export class LoggingService {
  constructor() {
    this.logsDir = path.join(__dirname, '..', '..', 'logs');
    this.ensureLogsDirectory();
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = process.env.LOG_LEVEL ? this.logLevels[process.env.LOG_LEVEL.toUpperCase()] : 2;
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log a message with specified level
   * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  log(level, message, meta = {}) {
    const levelNum = this.logLevels[level.toUpperCase()];
    if (levelNum > this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    // Console output with color coding
    this.consoleLog(level, message, meta);

    // File logging
    this.fileLog(logEntry);

    // Database logging for important events
    if (levelNum <= 1 || meta.important) {
      this.databaseLog(logEntry);
    }
  }

  /**
   * Console logging with color coding
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Metadata
   */
  consoleLog(level, message, meta) {
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[35m'  // Magenta
    };

    const resetColor = '\x1b[0m';
    const color = colors[level.toUpperCase()] || colors.INFO;

    const timestamp = new Date().toLocaleTimeString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    console.log(`${color}[${timestamp}] ${level.toUpperCase()}:${resetColor} ${message}${metaStr}`);
  }

  /**
   * File logging
   * @param {Object} logEntry - Log entry object
   */
  fileLog(logEntry) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `current-affairs-${date}.log`);

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Database logging for critical events
   * @param {Object} logEntry - Log entry
   */
  async databaseLog(logEntry) {
    try {
      // Import here to avoid circular dependencies
      const ResearchRun = (await import('../models/ResearchRun.js')).default;

      // Only log to database if we have a runId in the metadata
      if (logEntry.runId) {
        await ResearchRun.findOneAndUpdate(
          { runId: logEntry.runId },
          {
            $push: {
              logs: {
                level: logEntry.level.toLowerCase(),
                message: logEntry.message,
                timestamp: new Date(logEntry.timestamp),
                step: logEntry.step || 'general'
              }
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to log to database:', error);
    }
  }

  /**
   * Error logging with stack trace
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  error(error, context = {}) {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    };

    this.log('ERROR', error.message, errorInfo);
  }

  /**
   * Warning logging
   * @param {string} message - Warning message
   * @param {Object} meta - Metadata
   */
  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  /**
   * Info logging
   * @param {string} message - Info message
   * @param {Object} meta - Metadata
   */
  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  /**
   * Debug logging
   * @param {string} message - Debug message
   * @param {Object} meta - Metadata
   */
  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  /**
   * Performance logging
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metrics - Additional metrics
   */
  performance(operation, duration, metrics = {}) {
    this.log('INFO', `Performance: ${operation}`, {
      operation,
      duration,
      durationUnit: 'ms',
      ...metrics,
      important: duration > 30000 // Flag slow operations
    });
  }

  /**
   * Research run logging
   * @param {string} runId - Research run ID
   * @param {string} step - Current step
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  researchLog(runId, step, message, data = {}) {
    this.log('INFO', message, {
      runId,
      step,
      ...data
    });
  }

  /**
   * API request logging
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration
   */
  apiLog(method, url, statusCode, duration) {
    const level = statusCode >= 400 ? 'WARN' : 'DEBUG';
    this.log(level, `API ${method} ${url}`, {
      method,
      url,
      statusCode,
      duration,
      durationUnit: 'ms'
    });
  }

  /**
   * Get recent logs
   * @param {number} limit - Number of logs to retrieve
   * @param {string} level - Filter by level
   * @returns {Array} - Array of log entries
   */
  getRecentLogs(limit = 100, level = null) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logsDir, `current-affairs-${date}.log`);

      if (!fs.existsSync(logFile)) return [];

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      let logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(log => log !== null);

      // Filter by level if specified
      if (level) {
        logs = logs.filter(log => log.level === level.toUpperCase());
      }

      // Return most recent logs
      return logs.slice(-limit).reverse();
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  /**
   * Clean old log files
   * @param {number} daysToKeep - Number of days of logs to keep
   */
  cleanOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      files.forEach(file => {
        if (file.startsWith('current-affairs-') && file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);

          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error(error, { operation: 'cleanOldLogs' });
    }
  }

  /**
   * Get log statistics
   * @returns {Object} - Log statistics
   */
  getLogStats() {
    try {
      const recentLogs = this.getRecentLogs(1000);
      const stats = {
        totalLogs: recentLogs.length,
        byLevel: {},
        timeRange: {
          from: recentLogs.length > 0 ? recentLogs[recentLogs.length - 1].timestamp : null,
          to: recentLogs.length > 0 ? recentLogs[0].timestamp : null
        }
      };

      recentLogs.forEach(log => {
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      });

      return stats;
    } catch (error) {
      this.error(error, { operation: 'getLogStats' });
      return { error: 'Failed to get log statistics' };
    }
  }
}

// Export singleton instance
const loggingService = new LoggingService();

export default loggingService;
