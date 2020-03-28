import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import Recaptcha2 from "recaptcha2";
import { isArray } from "util";
import { singleton } from "tsyringe";

import { forwardError } from "../utils/expressUtils";
import { Config } from "../utils/config/config";
import Env from "../utils/config/env";

@singleton()
export default class RecaptchaMiddleware {
    private _reCaptcha: Recaptcha2;

    constructor(env: Env, config: Config) {
        if (!config.security.reCaptcha.enabled) {
            return;
        }

        this._reCaptcha = new Recaptcha2({
            siteKey: env.recaptchaSiteKey,
            secretKey: env.recaptchaSecretKey,
            ssl: config.security.reCaptcha.ssl,
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
            if (isArray(error)) {
                const captchaError = error[0];
                if (captchaError === "invalid-input-response") {
                    return forwardError(next, "invalidCaptchaResponse", HttpStatus.BAD_REQUEST);
                } else if (captchaError === "timeout-or-duplicate") {
                    return forwardError(next, "timeoutOrDuplicateCaptcha", HttpStatus.BAD_REQUEST);
                }
            }

            return forwardError(next, "captchaValidationFailed", HttpStatus.INTERNAL_SERVER_ERROR, error);
        }

        next();
    }
}
