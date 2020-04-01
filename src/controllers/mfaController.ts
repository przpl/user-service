import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../utils/expressUtils";
import { Config } from "../utils/config/config";
import { MfaManager } from "../managers/mfaManager";
import { MfaMethod } from "../dal/entities/mfaEntity";
import { InvalidPasswordException } from "../exceptions/userExceptions";
import { LocalLoginManager } from "../managers/localLoginManager";
import { MfaException } from "../exceptions/exceptions";

@singleton()
export default class MfaController {
    constructor(private _loginManager: LocalLoginManager, private _mfaManager: MfaManager, private _config: Config) {}

    public async requestMfa(req: Request, res: Response, next: NextFunction) {
        const userId = req.authenticatedUser.sub;

        if (!(await this._loginManager.isLocal(userId))) {
            return forwardError(next, "notLocalUser", HttpStatus.FORBIDDEN);
        }

        const { appName } = this._config.security.mfa;
        let otpAuthPath: string = null;
        try {
            otpAuthPath = await this._mfaManager.issueHotpOtpAuth(userId, MfaMethod.code, req.ip, appName);
        } catch (error) {
            if (error instanceof MfaException) {
                return forwardError(next, "mfaAlreadyActivated", HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        res.json({ otpAuthPath: otpAuthPath });
    }

    public async enableMfa(req: Request, res: Response, next: NextFunction) {
        const shouldEnable = true;
        this.changeMfa(req, res, next, shouldEnable);
    }

    public async disableMfa(req: Request, res: Response, next: NextFunction) {
        const shouldEnable = false;
        this.changeMfa(req, res, next, shouldEnable);
    }

    private async changeMfa(req: Request, res: Response, next: NextFunction, enableMfa: boolean) {
        const userId = req.authenticatedUser.sub;
        const { password, oneTimePassword } = req.body;

        if (!(await this._loginManager.verifyPassword(userId, password))) {
            return forwardError(next, "invalidPassword", HttpStatus.FORBIDDEN);
        }

        try {
            if (enableMfa) {
                await this._mfaManager.enableHtopFa(userId, oneTimePassword, req.ip);
            } else {
                await this._mfaManager.disableHtopFa(userId, oneTimePassword);
            }
        } catch (error) {
            if (error instanceof InvalidPasswordException) {
                return forwardError(next, "invalidOneTimePassword", HttpStatus.FORBIDDEN);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }
}
