/**
 * Logger Utility
 * Centralized logging for debugging and monitoring
 * 
 * Usage:
 *   logger.info('Message', data);
 *   logger.error('Error occurred', error);
 */

class Logger {
  constructor() {
    this.enabled = true; // Set to false in production
    this.prefix = '[Relearn]';
  }

  info(message, ...args) {
    if (this.enabled) {
      console.log(`${this.prefix} ℹ️`, message, ...args);
    }
  }

  warn(message, ...args) {
    if (this.enabled) {
      console.warn(`${this.prefix} ⚠️`, message, ...args);
    }
  }

  error(message, ...args) {
    if (this.enabled) {
      console.error(`${this.prefix} ❌`, message, ...args);
    }
  }

  success(message, ...args) {
    if (this.enabled) {
      console.log(`${this.prefix} ✅`, message, ...args);
    }
  }

  debug(message, ...args) {
    if (this.enabled) {
      console.debug(`${this.prefix} 🔍`, message, ...args);
    }
  }

  time(label) {
    if (this.enabled) {
      console.time(`${this.prefix} ⏱️ ${label}`);
    }
  }

  timeEnd(label) {
    if (this.enabled) {
      console.timeEnd(`${this.prefix} ⏱️ ${label}`);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.logger = logger;
}