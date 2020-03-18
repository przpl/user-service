import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { UserManager } from "../managers/userManger";

export default class EmailController {
    constructor(private _userManager: UserManager) {}

    public async confirmEmail(req: Request, res: Response, next: NextFunction) {
        const { email, emailSig } = req.body;
        const sigCorrect = this._userManager.verifyEmailSignature(email, emailSig);
        if (!sigCorrect) {
            return res.json({ result: false });
        }
        let result: boolean;
        try {
            result = await this._userManager.confirmEmail(email);
        } catch (error) {
            return res.json({ result: false });
        }

        res.json({ result: result });
    }

    public async resendEmail(req: Request, res: Response, next: NextFunction) {
        // TODO implement resend email method
        res.status(HttpStatus.NOT_IMPLEMENTED).send();
    }
}
