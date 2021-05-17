import { NextFunction, Request, Response } from "express";
import { singleton } from "tsyringe";

import { MfaException } from "../exceptions/exceptions";
import { InvalidPasswordException } from "../exceptions/userExceptions";
import { LocalLoginManager } from "../managers/localLoginManager";
import { MfaManager } from "../managers/mfaManager";
import { Config } from "../utils/config/config";
import { forwardInternalError } from "../utils/expressUtils";
import * as errors from "./commonErrors";

@singleton()
export default class MfaController {
    constructor(private _loginManager: LocalLoginManager, private _mfaManager: MfaManager, private _config: Config) {}

    public async requestMfa(req: Request, res: Response, next: NextFunction) {
        const userId = req.authenticatedUser.sub;

        if ((await this._loginManager.isLocal(userId)) === false) {
            return errors.notLocalUser(next);
        }

        const { appName } = this._config.security.mfa;
        let otpAuthPath: string = null;
        try {
            otpAuthPath = await this._mfaManager.generateTotp(userId, req.ip, appName);
        } catch (error) {
            if (error instanceof MfaException) {
                return errors.mfaAlreadyActivated(next);
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

        if ((await this._loginManager.verifyPassword(userId, password)) === false) {
            return errors.invalidPassword(next);
        }

        try {
            if (enableMfa) {
                await this._mfaManager.enableTotp(userId, oneTimePassword, req.ip);
            } else {
                await this._mfaManager.disableTotp(userId, oneTimePassword);
            }
        } catch (error) {
            if (error instanceof InvalidPasswordException) {
                return errors.invalidOneTimePassword(next);
            }
            return forwardInternalError(next, error);
        }

        res.json({ result: true });
    }
}
