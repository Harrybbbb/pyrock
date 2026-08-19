import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { ApiSuccess } from "@pyrock/shared";

/**
 * Wraps every successful controller response in a consistent
 * `{ success, data }` envelope so the frontend never has to guess shape.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccess<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccess<T>> {
    return next
      .handle()
      .pipe(map((data) => ({ success: true as const, data })));
  }
}
