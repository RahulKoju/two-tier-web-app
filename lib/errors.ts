type ErrorWithCode = Error & {
  code?: string;
  cause?: unknown;
};

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;

    if (typeof code === "string") {
      return code;
    }
  }

  return undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown error";
}

export function getSafeDatabaseErrorMessage(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (code === "ECONNREFUSED") {
    return "Couldn't connect to the database. Please check that the database server is running and reachable.";
  }

  if (message.includes("DATABASE_URL is not set")) {
    return "The database connection is not configured. Set DATABASE_URL and try again.";
  }

  return "A database error occurred. Please try again later.";
}

export function createLoggedServerError(
  fallbackMessage: string,
  error: unknown,
): ErrorWithCode {
  const safeDatabaseMessage = getSafeDatabaseErrorMessage(error);
  const nextError = new Error(
    process.env.NODE_ENV === "development" ? safeDatabaseMessage : fallbackMessage,
  ) as ErrorWithCode;

  const code = getErrorCode(error);

  if (code) {
    nextError.code = code;
  }

  nextError.cause = error;
  return nextError;
}
