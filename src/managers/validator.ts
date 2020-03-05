import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";

export default class Validator {
    private _register = [check("email").isLength({ min: 1 }), check("password").isLength({ min: 1 })];

    get register() {
        return [...this._register, this.validate];
    }

    private validate(req: Request, res: Response, next: NextFunction) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorsList: ErrorResponse[] = [
                {
                    id: "dataValidationFailed",
                    data: errors.array(),
                },
            ];
            return forwardError(next, errorsList, 400);
        }

        next();
    }
}
