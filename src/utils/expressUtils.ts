import { Response, NextFunction } from "express";
import { isArray, isString } from "util";
import HttpStatus from "http-status-codes";

import { ErrorResponse } from "../interfaces/errorResponse";

export function forwardInternalError(next: NextFunction, originalError: object) {
    forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, originalError);
}

export function forwardError(
    next: NextFunction,
    errors: ErrorResponse | ErrorResponse[] | string,
    responseStatusCode: number,
    originalError?: object
) {
    let errorsArray: ErrorResponse[] = [];
    if (isString(errors)) {
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

export function handleError(err: any, res: Response, isDev: boolean) {
    if (!err) {
        return res.send();
    }

    if (err.responseStatusCode === HttpStatus.NOT_FOUND) {
        return handleNotFoundError(res);
    }

    res.status(err.responseStatusCode || HttpStatus.INTERNAL_SERVER_ERROR);

    // TODO if error is INTERNAL_SERVER_ERROR, send it to sentry

    const response: any = { errors: [] };
    if (err.responseErrorsList && isArray(err.responseErrorsList)) {
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
            console.log(stack);
        }
        response.$devOnly = { message: message, stack: stack };
    }

    res.json(response);
}

export function handleNotFoundError(res: Response) {
    const response = {
        errors: [
            {
                id: "resourceNotFound",
                message: "The requested resource could not be found.",
            },
        ],
    };
    res.status(HttpStatus.NOT_FOUND).json(response);
}
