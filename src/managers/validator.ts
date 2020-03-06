import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";

// TODO max length from config, validation of other fields based on config file
export default class Validator {
    private _register = [
        check("email")
            .isString()
            .isLength({ min: 5, max: 70 })
            .trim()
            .isEmail()
            .normalizeEmail(),
        check("password")
            .isString()
            .isLength({ min: 6, max: 128 }),
    ];

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
            return forwardError(next, errorsList, HttpStatus.BAD_REQUEST);
        }

        next();
    }
}
