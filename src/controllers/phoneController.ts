import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { ResendCodeLimitException, ResendCodeTimeLimitException } from "../exceptions/exceptions";
import { QueueService } from "../services/queueService";
import { LocalLoginManager } from "../managers/localLoginManager";
import { Phone } from "../models/phone";

@singleton()
export default class PhoneController {
    constructor(private _loginManager: LocalLoginManager, private _queueService: QueueService) {}

    public async confirmPhone(req: Request, res: Response, next: NextFunction) {
        const phone = new Phone(req.body.phone.code, req.body.phone.number);
        const success = await this._loginManager.confirmPhone(phone, req.body.code);
        res.json({ result: success });
    }

    public async resendPhone(req: Request, res: Response, next: NextFunction) {
        const phone = new Phone(req.body.phone.code, req.body.phone.number);
        let code: string;
        try {
            code = await this._loginManager.getPhoneCode(phone);
        } catch (error) {
            if (error instanceof ResendCodeLimitException) {
                return forwardError(next, "limitExceeded", HttpStatus.BAD_REQUEST);
            } else if (error instanceof ResendCodeTimeLimitException) {
                return res.json({ result: true, tooOffen: true });
            }
            return forwardInternalError(next, error);
        }

        this._queueService.pushPhoneCode(phone, code);

        res.json({ result: true });
    }
}
