import { Response, NextFunction } from "express";
import { isArray } from "util";
import HttpStatus from "http-status-codes";

import { ErrorResponse } from "../interfaces/errorResponse";

export function forwardError(next: NextFunction, errors?: ErrorResponse[], responseStatusCode = HttpStatus.INTERNAL_SERVER_ERROR) {
    const error = {
        responseErrorsList: errors,
        responseStatusCode: responseStatusCode,
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

    const response: any = { errors: [] };
    if (err.responseErrorsList && isArray(err.responseErrorsList)) {
        response.errors = err.responseErrorsList;
    }

    if (isDev) {
        console.log(err.stack);
        response.$devOnly = { message: err.message, stack: err.stack };
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
