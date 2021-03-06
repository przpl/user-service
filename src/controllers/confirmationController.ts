import { NextFunction, Request, Response } from "express";
import { singleton } from "tsyringe";

import { ConfirmationType } from "../dal/entities/confirmationEntity";
import { ResendCodeLimitException, ResendCodeTimeLimitException } from "../exceptions/exceptions";
import { LocalLoginManager } from "../managers/localLoginManager";
import { PrimaryLoginType } from "../models/credentials";
import { Phone } from "../models/phone";
import { extractCredentialsWithoutUsername } from "../models/utils/toModelMappers";
import { MessageBroker } from "../services/messageBroker";
import { RequestBody } from "../types/express/requestBody";
import { forwardInternalError } from "../utils/expressUtils";
import * as errors from "./commonErrors";

@singleton()
export default class ConfirmationController {
    constructor(private _loginManager: LocalLoginManager, private _queueService: MessageBroker) {}

    public async confirm(req: Request, res: Response, next: NextFunction) {
        const subject = this.extractSubject(req.body);
        const success = await this._loginManager.confirm(subject.value, req.body.code.toUpperCase(), subject.type);
        const subjectType = this.getPrimaryLoginType(req.body);
        if (subjectType === PrimaryLoginType.email) {
            // TODO if user has a phone, generate and push code
            // TODO if user has to confirm a phone, send information to frontend
        }

        res.json({ result: success });
    }

    public async resend(req: Request, res: Response, next: NextFunction) {
        const subject = this.extractSubject(req.body);

        let code: string;
        try {
            code = await this._loginManager.getConfirmationCode(subject.value, subject.type);
        } catch (error) {
            if (error instanceof ResendCodeLimitException) {
                errors.limitExceeded(next);
                return;
            } else if (error instanceof ResendCodeTimeLimitException) {
                res.json({ result: true, tooOften: true });
                return;
            }
            forwardInternalError(next, error);
            return;
        }

        if (subject.type === ConfirmationType.email) {
            this._queueService.pushEmailCode(subject.value, code, "confirmAccount");
        } else if (subject.type === ConfirmationType.phone) {
            this._queueService.pushPhoneCode(this.extractPhone(req.body), code, "confirmAccount");
        }

        res.json({ result: true });
    }

    private getPrimaryLoginType(body: RequestBody): PrimaryLoginType {
        return extractCredentialsWithoutUsername(body).getPrimary();
    }

    private extractSubject(body: RequestBody): { value: string; type: ConfirmationType } {
        const credentials = extractCredentialsWithoutUsername(body);
        const primary = this.getPrimaryLoginType(body);

        if (primary === PrimaryLoginType.email) {
            return { value: credentials.email, type: ConfirmationType.email };
        }

        if (primary === PrimaryLoginType.phone) {
            const { code, number } = credentials.phone;
            return { value: `${code}/${number}`, type: ConfirmationType.phone };
        }

        throw new Error("Cannot extract subject. Unknown type.");
    }

    private extractPhone(body: RequestBody): Phone {
        return extractCredentialsWithoutUsername(body).phone;
    }
}
