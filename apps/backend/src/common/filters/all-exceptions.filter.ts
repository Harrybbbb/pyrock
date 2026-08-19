import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiFailure } from "@pyrock/shared";

/**
 * Single place that turns any thrown error into the API's error envelope.
 * Keeps controllers/services free of try/catch-and-format boilerplate.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, message, code } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiFailure = { success: false, error: { message, code } };
    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    message: string;
    code: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === "string"
          ? response
          : ((response as { message?: string | string[] }).message ??
            exception.message);
      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join("; ") : message,
        code: HttpStatus[exception.getStatus()] ?? "HTTP_ERROR",
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    };
  }
}
