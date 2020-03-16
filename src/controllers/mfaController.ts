import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { UserManager } from "../managers/userManger";
import { TwoFaMethod } from "../dal/entities/userEntity";
import { TwoFaService } from "../services/twoFaService";

export default class MfaController {
    constructor(private _userManager: UserManager, private _twoFaService: TwoFaService, private _appName: string) {}

    public async requestTwoFa(req: Request, res: Response, next: NextFunction) {
        const user = await this._userManager.getUserById(req.authenticatedUser.sub);

        if (!user.isLocalAccount) {
            return forwardError(next, [{ id: "notLocalAccount" }], HttpStatus.CONFLICT);
        }

        if (user.twoFaMethod !== TwoFaMethod.none) {
            return forwardError(next, [{ id: "twoFaAlreadyActivated" }], HttpStatus.CONFLICT);
        }

        const otpAuthPath = await this._twoFaService.issueHotpOtpAuth(req.authenticatedUser.sub, this._appName);

        res.json({ otpAuthPath: otpAuthPath });
    }

    public async enableTwoFa(req: Request, res: Response, next: NextFunction) {
        const userId = req.authenticatedUser.sub;
        const { password, oneTimePassword } = req.body;

        if (!(await this._twoFaService.verifyHtop(req.authenticatedUser.sub, oneTimePassword))) {
            return forwardError(next, [{ id: "invalidOneTimePassword" }], HttpStatus.CONFLICT);
        }

        if (!(await this._userManager.verifyPassword(userId, password))) {
            return forwardError(next, [{ id: "invalidPassword" }], HttpStatus.FORBIDDEN);
        }

        await this._userManager.enableHtopFa(userId);

        res.json({ result: true });
    }

    public async disableTwoFa(req: Request, res: Response, next: NextFunction) {
        const userId = req.authenticatedUser.sub;
        const { password, oneTimePassword } = req.body;

        // TODO duplicated validation
        if (!(await this._twoFaService.verifyHtop(req.authenticatedUser.sub, oneTimePassword))) {
            return forwardError(next, [{ id: "invalidOneTimePassword" }], HttpStatus.CONFLICT);
        }

        if (!(await this._userManager.verifyPassword(userId, password))) {
            return forwardError(next, [{ id: "invalidPassword" }], HttpStatus.FORBIDDEN);
        }

        await this._userManager.disableHtopFa(userId);

        res.json({ result: true });
    }
}
