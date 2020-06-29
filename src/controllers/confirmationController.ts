import { Request, Response, NextFunction } from "express";
import { singleton } from "tsyringe";

import { forwardInternalError } from "../utils/expressUtils";
import { ResendCodeLimitException, ResendCodeTimeLimitException } from "../exceptions/exceptions";
import { QueueService } from "../services/queueService";
import { LocalLoginManager } from "../managers/localLoginManager";
import { extractCredentialsWithoutUsername } from "../models/utils/toModelMappers";
import { PrimaryLoginType } from "../models/credentials";
import { RequestBody } from "../types/express/requestBody";
import { ConfirmationType } from "../dal/entities/confirmationEntity";
import { Phone } from "../models/phone";
import * as errors from "./commonErrors";

@singleton()
export default class ConfirmationController {
    constructor(private _loginManager: LocalLoginManager, private _queueService: QueueService) {}

    public async confirm(req: Request, res: Response, next: NextFunction) {
        const subject = this.extractSubject(req.body);
        const success = await this._loginManager.confirm(subject.value, req.body.code, subject.type);
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
                return errors.limitExceeded(next);
            } else if (error instanceof ResendCodeTimeLimitException) {
                return res.json({ result: true, tooOften: true });
            }
            return forwardInternalError(next, error);
        }

        if (subject.type === ConfirmationType.email) {
            this._queueService.pushEmailCode(subject.value, code);
        } else if (subject.type === ConfirmationType.phone) {
            this._queueService.pushPhoneCode(this.extractPhone(req.body), code);
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
