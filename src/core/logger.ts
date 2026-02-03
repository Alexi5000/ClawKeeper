// file: src/core/logger.ts
// description: Structured JSON logging for observability
// reference: src/api/server.ts, src/agents/base.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  tenant_id?: string;
  user_id?: string;
  agent_id?: string;
  request_id?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private context: LogContext = {};
  private min_level: LogLevel = 'info';

  constructor() {
    // Set minimum log level from environment
    const env_level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (env_level && ['debug', 'info', 'warn', 'error'].includes(env_level)) {
      this.min_level = env_level;
    }
  }

  set_context(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  clear_context() {
    this.context = {};
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const error_context = error
      ? {
          ...context,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : context;
    this.log('error', message, error_context);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.should_log(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    // Remove undefined/null values
    if (entry.context) {
      Object.keys(entry.context).forEach(key => {
        if (entry.context![key] === undefined || entry.context![key] === null) {
          delete entry.context![key];
        }
      });
      if (Object.keys(entry.context).length === 0) {
        delete entry.context;
      }
    }

    const json = JSON.stringify(entry);

    // Output based on level
    if (level === 'error') {
      console.error(json);
    } else if (level === 'warn') {
      console.warn(json);
    } else {
      console.log(json);
    }
  }

  private should_log(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const level_index = levels.indexOf(level);
    const min_index = levels.indexOf(this.min_level);
    return level_index >= min_index;
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    child.min_level = this.min_level;
    return child;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for middleware/context
export type { LogContext, LogLevel };
