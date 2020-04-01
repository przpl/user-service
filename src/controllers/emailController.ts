import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { EmailResendCodeLimitException, EmailResendCodeTimeLimitException } from "../exceptions/exceptions";
import { QueueService } from "../services/queueService";
import { LocalLoginManager } from "../managers/localLoginManager";

@singleton()
export default class EmailController {
    constructor(private _loginManager: LocalLoginManager, private _queueService: QueueService) {}

    public async confirmEmail(req: Request, res: Response, next: NextFunction) {
        const success = await this._loginManager.confirmCode(req.body.email, req.body.code);
        res.json({ result: success });
    }

    public async resendEmail(req: Request, res: Response, next: NextFunction) {
        const { email } = req.body;

        let code: string;
        try {
            code = await this._loginManager.getCodeAndIncrementCounter(email);
        } catch (error) {
            if (error instanceof EmailResendCodeLimitException) {
                return forwardError(next, "limitExceeded", HttpStatus.BAD_REQUEST);
            } else if (error instanceof EmailResendCodeTimeLimitException) {
                return res.json({ result: true, tooOffen: true });
            }
            return forwardInternalError(next, error);
        }

        this._queueService.pushEmailCode(email, code);

        res.json({ result: true });
    }
}
