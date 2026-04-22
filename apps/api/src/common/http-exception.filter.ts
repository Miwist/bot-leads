import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { logError } from "./logging";

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  private readonly log = new Logger(HttpExceptionLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp
      ? exception.message
      : exception instanceof Error
        ? exception.message
        : "Unexpected error";

    logError(this.log, "http_exception", {
      requestId: req.requestId || "",
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      message,
    });

    if (res.headersSent) return;
    res.status(status).json({
      statusCode: status,
      message,
      requestId: req.requestId || "",
    });
  }
}
