export type ApiErrorOptions = {
  message: string;
  code: string;
  status?: number;
  requestId?: string;
  cause?: unknown;
};

/** 前端 API 统一错误：两个应用以子类形式保留各自的 error name 与 instanceof 语义。 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
