export type ErrorCode =
  | "NO_EVIDENCE"
  | "INVALID_FACEBOOK_URL"
  | "FILE_TYPE_UNSUPPORTED"
  | "PAYLOAD_TOO_LARGE"
  | "SCREENSHOT_UNREADABLE"
  | "REFERENCE_NOT_FOUND"
  | "CASE_EXPIRED"
  | "CASE_INVALID"
  | "FOLLOWUP_ALREADY_USED"
  | "MODEL_RATE_LIMITED"
  | "MODEL_TIMEOUT"
  | "MODEL_BAD_RESPONSE"
  | "MODEL_UNAVAILABLE"
  | "CONFIG_INVALID";

const RECOVERABLE: Record<ErrorCode, boolean> = {
  NO_EVIDENCE: true,
  INVALID_FACEBOOK_URL: true,
  FILE_TYPE_UNSUPPORTED: true,
  PAYLOAD_TOO_LARGE: true,
  SCREENSHOT_UNREADABLE: true,
  REFERENCE_NOT_FOUND: true,
  CASE_EXPIRED: false,
  CASE_INVALID: false,
  FOLLOWUP_ALREADY_USED: false,
  MODEL_RATE_LIMITED: true,
  MODEL_TIMEOUT: true,
  MODEL_BAD_RESPONSE: true,
  MODEL_UNAVAILABLE: true,
  CONFIG_INVALID: false,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly recoverable: boolean;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.recoverable = RECOVERABLE[code];
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; recoverable: boolean; requestId: string };
}

export function errorBody(err: AppError, requestId: string): ErrorBody {
  return { error: { code: err.code, message: err.message, recoverable: err.recoverable, requestId } };
}
