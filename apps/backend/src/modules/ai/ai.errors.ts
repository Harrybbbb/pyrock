/** Provider-level failure: timeout, network error, non-2xx response. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** The model responded, but not with parseable JSON matching the extraction shape. */
export class AiMalformedOutputError extends Error {
  constructor(
    message: string,
    readonly rawOutput?: string,
  ) {
    super(message);
    this.name = "AiMalformedOutputError";
  }
}
