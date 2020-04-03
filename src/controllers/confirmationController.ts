import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { ResendCodeLimitException, ResendCodeTimeLimitException } from "../exceptions/exceptions";
import { QueueService } from "../services/queueService";
import { LocalLoginManager, ConfirmationResult } from "../managers/localLoginManager";
import { extractCredentialsWithoutUsername } from "../models/utils/toModelMappers";
import { Phone } from "../models/phone";
import { PrimaryLoginType } from "../models/credentials";
import { RequestBody } from "../types/express/requestBody";
import { ConfirmationType } from "../dal/entities/confirmationEntity";

@singleton()
export default class ConfirmationController {
    constructor(private _loginManager: LocalLoginManager, private _queueService: QueueService) {}

    public async confirm(req: Request, res: Response, next: NextFunction) {
        const subject = this.extractEmailOrPhone(req.body);
        const success = await this._loginManager.confirm(subject, req.body.code);
        res.json({ result: success });
    }

    public async resend(req: Request, res: Response, next: NextFunction) {
        const subject = this.extractEmailOrPhone(req.body);

        let result: ConfirmationResult;
        try {
            result = await this._loginManager.getConfirmationCode(subject);
        } catch (error) {
            if (error instanceof ResendCodeLimitException) {
                return forwardError(next, "limitExceeded", HttpStatus.BAD_REQUEST);
            } else if (error instanceof ResendCodeTimeLimitException) {
                return res.json({ result: true, tooOffen: true });
            }
            return forwardInternalError(next, error);
        }

        if (result.type === ConfirmationType.email) {
            this._queueService.pushEmailCode(subject as string, result.code);
        } else if (result.type === ConfirmationType.phone) {
            this._queueService.pushPhoneCode(subject as Phone, result.code);
        }

        res.json({ result: true });
    }

    private extractEmailOrPhone(body: RequestBody): string | Phone {
        const credentials = extractCredentialsWithoutUsername(body);
        const primary = credentials.getPrimary();
        let emailOrPhone: string | Phone = null;
        if (primary === PrimaryLoginType.email) {
            emailOrPhone = credentials.email;
        } else if (primary === PrimaryLoginType.phone) {
            emailOrPhone = credentials.phone;
        }
        return emailOrPhone;
    }
}
