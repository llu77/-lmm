/**
 * API Type Definitions
 * Centralized API response and request types
 */

import { User } from './user.types';

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  user?: User;
  authenticated?: boolean;
}

export interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  credentials?: RequestCredentials;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
