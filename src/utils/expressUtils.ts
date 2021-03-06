import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { ErrorResponse } from "../interfaces/errorResponse";
import { captureExceptionWithSentry } from "./sentryUtils";

export function forwardInternalError(next: NextFunction, originalError: any) {
    forwardError(next, [], StatusCodes.INTERNAL_SERVER_ERROR, originalError);
}

export function forwardError(
    next: NextFunction,
    errors: ErrorResponse | ErrorResponse[] | string,
    responseStatusCode: number,
    originalError?: any
) {
    let errorsArray: ErrorResponse[] = [];
    if (typeof errors === "string") {
        errorsArray = [{ id: errors }];
    } else if (Array.isArray(errors)) {
        errorsArray = errors;
    } else {
        errorsArray = [errors];
    }

    const error = {
        responseErrorsList: errorsArray,
        responseStatusCode: responseStatusCode,
        originalError: originalError,
    };
    next(error);
}

export function handleError(err: any, req: Request, res: Response, isDev: boolean, sentryKey: string) {
    if (!err) {
        return !res.headersSent && res.send();
    }

    if (err.responseStatusCode === StatusCodes.NOT_FOUND) {
        return handleNotFoundError(res);
    }

    err.responseStatusCode = err.responseStatusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(err.responseStatusCode);

    if (err.responseStatusCode === StatusCodes.INTERNAL_SERVER_ERROR && sentryKey) {
        const errorToLog = new Error(err.message);
        errorToLog.stack = err.stack;
        captureExceptionWithSentry(errorToLog, req.authenticatedUser, true);
    }

    const response: any = { errors: [] };
    if (err.responseErrorsList && Array.isArray(err.responseErrorsList)) {
        response.errors = err.responseErrorsList;
    }

    if (isDev) {
        let message: string = err.message;
        let stack: string = err.stack;
        if (err.originalError) {
            message = err.originalError.message;
            stack = err.originalError.stack;
        }

        if (stack) {
            // eslint-disable-next-line no-console
            console.log(stack);
        }
        response.$devOnly = { message: message, stack: stack };
    }

    !res.headersSent && res.json(response);
}

export function handleNotFoundError(res: Response, noEndpointMatch = false) {
    const response = {
        errors: [
            {
                id: "resourceNotFound",
                message: "The requested resource could not be found.",
            },
        ],
    };
    if (noEndpointMatch) {
        response.errors.push({
            id: "noEndpointMatch",
            message: "There is no endpoint matching requested method and url.",
        });
    }
    !res.headersSent && res.status(StatusCodes.NOT_FOUND).json(response);
}
