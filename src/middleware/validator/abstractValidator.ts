import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { validationResult } from "express-validator";

import { ErrorResponse } from "../../interfaces/errorResponse";
import { forwardError } from "../../utils/expressUtils";

export abstract class AbstractValidator {
    protected validate(req: Request, res: Response, next: NextFunction) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const data = errors.array();
            for (const d of data) {
                delete d.nestedErrors;
            }
            const errorsList: ErrorResponse[] = [
                {
                    id: "dataValidationFailed",
                    data: data,
                },
            ];
            return forwardError(next, errorsList, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        next();
    }
}
