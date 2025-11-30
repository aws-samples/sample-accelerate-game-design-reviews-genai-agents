import { GraphQLError } from 'graphql';

export interface AppError {
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  message: string;
  originalError?: Error;
  code?: string;
  statusCode?: number;
}

export class ErrorHandler {
  /**
   * Parse and categorize different types of errors
   */
  static parseError(error: unknown): AppError {
    // Handle GraphQL errors
    if (error && typeof error === 'object' && 'graphQLErrors' in error) {
      const graphQLErrors = (error as any).graphQLErrors as GraphQLError[];
      if (graphQLErrors && graphQLErrors.length > 0) {
        const firstError = graphQLErrors[0];
        return {
          type: 'server',
          message: firstError.message,
          originalError: error as unknown as Error,
          code: firstError.extensions?.['code'] as string
        };
      }
    }

    // Handle network errors
    if (error && typeof error === 'object' && 'networkError' in error) {
      const networkError = (error as any).networkError;
      return {
        type: 'network',
        message: 'Network connection failed. Please check your internet connection.',
        originalError: error as unknown as Error,
        statusCode: networkError?.statusCode
      };
    }

    // Handle Amplify Auth errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as any).name;
      switch (errorName) {
        case 'NotAuthorizedException':
          return {
            type: 'auth',
            message: 'Invalid username or password.',
            originalError: error as Error,
            code: errorName
          };
        case 'UserNotConfirmedException':
          return {
            type: 'auth',
            message: 'Please confirm your account before signing in.',
            originalError: error as Error,
            code: errorName
          };
        case 'UserNotFoundException':
          return {
            type: 'auth',
            message: 'User not found. Please check your username.',
            originalError: error as Error,
            code: errorName
          };
        case 'TooManyRequestsException':
          return {
            type: 'auth',
            message: 'Too many failed attempts. Please try again later.',
            originalError: error as Error,
            code: errorName
          };
      }
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as any).message as string;
      if (message.includes('validation') || message.includes('required')) {
        return {
          type: 'validation',
          message: message,
          originalError: error as Error
        };
      }
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        type: 'unknown',
        message: error.message || 'An unexpected error occurred.',
        originalError: error
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        type: 'unknown',
        message: error,
        originalError: new Error(error)
      };
    }

    // Fallback for unknown error types
    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again.',
      originalError: error instanceof Error ? error : new Error(String(error))
    };
  }

  /**
   * Get user-friendly error message based on error type
   */
  static getUserMessage(appError: AppError): string {
    switch (appError.type) {
      case 'network':
        return 'Connection failed. Please check your internet connection and try again.';
      case 'auth':
        return appError.message; // Auth messages are already user-friendly
      case 'validation':
        return appError.message; // Validation messages are already user-friendly
      case 'server':
        return appError.code === 'INTERNAL_SERVER_ERROR' 
          ? 'Server error. Please try again later.'
          : appError.message;
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Determine if error should be retried automatically
   */
  static isRetryable(appError: AppError): boolean {
    switch (appError.type) {
      case 'network':
        return true;
      case 'server':
        return appError.statusCode ? appError.statusCode >= 500 : false;
      default:
        return false;
    }
  }

  /**
   * Log error for debugging (in development) or monitoring (in production)
   */
  static logError(appError: AppError, context?: string): void {
    const logData = {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      context,
      timestamp: new Date().toISOString(),
      originalError: appError.originalError
    };

    if (process.env['NODE_ENV'] === 'development') {
      console.error('Application Error:', logData);
    } else {
      // In production, you might want to send to a monitoring service
      console.error('Error:', appError.message, { context });
    }
  }
}

/**
 * Retry utility with exponential backoff
 */
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: AppError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = ErrorHandler.parseError(error);
        
        // Don't retry if error is not retryable or this is the last attempt
        if (!ErrorHandler.isRetryable(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        ErrorHandler.logError(lastError, `Retry attempt ${attempt + 1}/${maxRetries}`);
      }
    }

    throw lastError!;
  }
}