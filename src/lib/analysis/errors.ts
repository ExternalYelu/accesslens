export type ErrorCode =
  | "CONFIGURATION" | "DISABLED" | "ORIGIN" | "CONSENT_REQUIRED"
  | "INVALID_INPUT" | "IMAGE_TOO_LARGE" | "BUSY" | "CANCELLED" | "TIMEOUT"
  | "PROVIDER_AUTH" | "PROVIDER_RATE_LIMIT" | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_REJECTED" | "INVALID_OUTPUT" | "INCOMPLETE_OUTPUT" | "REFUSED";

const definitions: Record<ErrorCode, { status: number; message: string }> = {
  CONFIGURATION: { status: 503, message: "Configure MODEL_API_KEY on the server before analysis." },
  DISABLED: { status: 503, message: "Live analysis is currently available only in local development." },
  ORIGIN: { status: 403, message: "Analysis requires a request from this application's own origin." },
  CONSENT_REQUIRED: { status: 400, message: "Confirm consent to send this image to Meta before analysis." },
  INVALID_INPUT: { status: 400, message: "Use a valid, single-frame JPEG, PNG, or WebP image." },
  IMAGE_TOO_LARGE: { status: 413, message: "Use an image under 4 MB and 16 million pixels." },
  BUSY: { status: 429, message: "Analysis is already running. Wait before trying again." },
  CANCELLED: { status: 499, message: "Analysis was cancelled." },
  TIMEOUT: { status: 504, message: "Analysis timed out. Try again with a smaller image." },
  PROVIDER_AUTH: { status: 503, message: "Meta rejected the server credentials or model permissions. Check the account setup." },
  PROVIDER_RATE_LIMIT: { status: 429, message: "Meta's rate or account limit was reached. Check billing and try later." },
  PROVIDER_UNAVAILABLE: { status: 502, message: "Meta is temporarily unavailable. Try again later." },
  PROVIDER_REJECTED: { status: 502, message: "Meta rejected the analysis request. The integration needs review." },
  INVALID_OUTPUT: { status: 502, message: "Meta returned evidence that could not be validated. No route conclusion was made." },
  INCOMPLETE_OUTPUT: { status: 502, message: "Meta's evidence was incomplete. Missing evidence does not mean clear floor." },
  REFUSED: { status: 422, message: "Meta declined to analyze this image. Try another image." },
};

/** Only fixed, application-owned messages cross the HTTP or CLI boundary. */
export class AnalysisError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode) {
    super(definitions[code].message);
    this.name = "AnalysisError";
    this.code = code;
    this.status = definitions[code].status;
  }
}

export function publicError(error: unknown): AnalysisError {
  return error instanceof AnalysisError ? error : new AnalysisError("PROVIDER_UNAVAILABLE");
}
