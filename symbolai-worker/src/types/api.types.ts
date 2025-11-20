/**
 * API Response and Error Types
 * Standardized API response handling for the application
 */

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: number;
}

/**
 * API Error class with status codes
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON(): ApiResponse {
    return {
      success: false,
      error: this.message,
      message: this.code,
      timestamp: Date.now()
    };
  }
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Request validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ApiResponse {
  errors: ValidationError[];
}

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: Date.now()
  };
}

/**
 * Helper to create error response
 */
export function errorResponse(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    message: code,
    timestamp: Date.now()
  };
}
