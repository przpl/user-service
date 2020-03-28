import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError } from "../utils/expressUtils";
import { UserManager } from "../managers/userManger";
import { MfaMethod } from "../dal/entities/userEntity";
import { MfaService } from "../services/mfaService";
import { JsonConfig } from "../utils/config/jsonConfig";
import Config from "../utils/config/config";

@singleton()
export default class MfaController {
    private _jsonConfig: JsonConfig;

    constructor(private _userManager: UserManager, private _mfaService: MfaService, config: Config) {
        this._jsonConfig = config.jsonConfig;
    }

    public async requestMfa(req: Request, res: Response, next: NextFunction) {
        const user = await this._userManager.getUserById(req.authenticatedUser.sub);

        if (!user.isLocalAccount) {
            return forwardError(next, "notLocalAccount", HttpStatus.METHOD_NOT_ALLOWED);
        }
        if (user.mfaMethod !== MfaMethod.none) {
            return forwardError(next, "mfaAlreadyActivated", HttpStatus.METHOD_NOT_ALLOWED);
        }

        const otpAuthPath = await this._mfaService.issueHotpOtpAuth(req.authenticatedUser.sub, this._jsonConfig.security.mfa.appName);
        res.json({ otpAuthPath: otpAuthPath });
    }

    public async enableMfa(req: Request, res: Response, next: NextFunction) {
        const userId = req.authenticatedUser.sub;
        const { password, oneTimePassword } = req.body;

        if (!(await this.authorizeRequest(userId, password, oneTimePassword, next))) {
            return;
        }

        await this._userManager.enableHtopFa(userId);

        res.json({ result: true });
    }

    public async disableMfa(req: Request, res: Response, next: NextFunction) {
        const userId = req.authenticatedUser.sub;
        const { password, oneTimePassword } = req.body;

        if (!(await this.authorizeRequest(userId, password, oneTimePassword, next))) {
            return;
        }

        await this._userManager.disableHtopFa(userId);

        res.json({ result: true });
    }

    private async authorizeRequest(userId: string, password: string, oneTimePassword: string, next: NextFunction): Promise<boolean> {
        if (!(await this._mfaService.verifyHtop(userId, oneTimePassword))) {
            forwardError(next, "invalidOneTimePassword", HttpStatus.FORBIDDEN);
            return false;
        }
        if (!(await this._userManager.verifyPassword(userId, password))) {
            forwardError(next, "invalidPassword", HttpStatus.FORBIDDEN);
            return false;
        }
        return true;
    }
}
