import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import Recaptcha2 from "recaptcha2";
import { isArray } from "util";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";

export default class RecaptchaMiddleware {
    private _reCaptcha: Recaptcha2;

    constructor(enabled: boolean, siteKey: string, secretKey: string, sslEnabled: boolean) {
        if (!enabled) {
            return;
        }

        this._reCaptcha = new Recaptcha2({
            siteKey: siteKey,
            secretKey: secretKey,
            ssl: sslEnabled,
        });
    }

    public async verify(req: Request, res: Response, next: NextFunction, enabledOnEndpoint: boolean) {
        if (!this._reCaptcha || !enabledOnEndpoint) {
            return next();
        }

        const { recaptchaKey } = req.body;

        try {
            await this._reCaptcha.validate(recaptchaKey);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.BAD_REQUEST;
            if (isArray(error)) {
                const captchaError = error[0];
                if (captchaError === "invalid-input-response") {
                    errors.push({ id: "invalidCaptchaResponse" });
                } else if (captchaError === "timeout-or-duplicate") {
                    errors.push({ id: "timeoutOrDuplicateCaptcha" });
                } else {
                    errors.push({ id: "captchaValidationFailed" });
                    responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
                }
            } else {
                errors.push({ id: "captchaValidationFailed" });
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }

            return forwardError(next, errors, responseCode, error);
        }

        next();
    }
}
