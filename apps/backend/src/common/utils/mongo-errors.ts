interface MongoServerErrorLike {
  code?: number;
}

/** True for MongoDB's E11000 duplicate key error — the signal our idempotency check relies on. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as MongoServerErrorLike).code === 11000
  );
}
