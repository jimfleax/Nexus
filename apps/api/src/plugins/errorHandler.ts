/**
 * @file errorHandler.ts
 * @description Global error handling plugin for the Fastify application.
 * @architecture Centralizes error processing, converting internal errors and validation failures into standardized API responses.
 */
import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyError } from "fastify";
import { ApplicationError } from "../utils/errors.js";

/**
 * @desc    Registers the global error handler for the Fastify server
 * @param   {import("fastify").FastifyInstance} fastify - Fastify instance
 */
export const errorHandlerPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.setErrorHandler(function (
    error: FastifyError | Error,
    request,
    reply,
  ) {
    let appError: ApplicationError;

    // 1. Zod / Fastify Validation Errors
    if ("validation" in error || (error as any).code === "FST_ERR_VALIDATION") {
      appError = new ApplicationError(
        "Validation failed",
        "VALIDATION_ERROR",
        400,
        (error as any).validation,
      );
    }
    // 2. Mongoose Duplicate Key Error
    else if ((error as any).code === 11000) {
      appError = new ApplicationError(
        "Resource already exists",
        "CONFLICT_ERROR",
        409,
        (error as any).keyValue,
      );
    }
    // 3. Mongoose Cast Error (e.g. invalid ObjectId)
    else if (error.name === "CastError") {
      appError = new ApplicationError(
        "Invalid resource ID",
        "VALIDATION_ERROR",
        400,
      );
    }
    // 4. Mongoose ValidationError
    else if (error.name === "ValidationError") {
      appError = new ApplicationError(
        "Validation failed",
        "VALIDATION_ERROR",
        400,
        (error as any).errors,
      );
    }
    // 5. Known ApplicationError
    else if (error instanceof ApplicationError) {
      appError = error;
    }
    // 6. Fallback unhandled error
    else {
      appError = new ApplicationError(
        "An unexpected error occurred",
        "INTERNAL_ERROR",
        500,
      );
    }

    // Logging
    if (appError.statusCode >= 500) {
      request.log.error({ err: error, req: request }, appError.message);
    } else {
      request.log.warn(
        { req: request, errCode: appError.code },
        appError.message,
      );
    }

    // Send standardized JSON response
    reply.status(appError.statusCode).send({
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    });
  });
});
