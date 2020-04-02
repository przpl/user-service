import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { container, singleton } from "tsyringe";

import { JwtService } from "../../services/jwtService";
import { SessionManager } from "../../managers/sessionManager";
import { UserAgent } from "../../interfaces/userAgent";
import { RoleManager } from "../../managers/roleManager";
import { LockManager } from "../../managers/lockManager";
import { ErrorResponse } from "../../interfaces/errorResponse";
import { forwardError } from "../../utils/expressUtils";
import { MfaMethod } from "../../dal/entities/mfaEntity";
import { MfaManager } from "../../managers/mfaManager";
import { RequestBody } from "../../types/express/requestBody";
import { Credentials } from "../../models/credentials";
import { Config } from "../../utils/config/config";
import { QueueService } from "../../services/queueService";

@singleton()
export default class UserController {
    protected _sessionManager = container.resolve(SessionManager);
    protected _roleManager = container.resolve(RoleManager);
    protected _lockManager = container.resolve(LockManager);
    protected _mfaManager = container.resolve(MfaManager);
    protected _jwtService = container.resolve(JwtService);
    protected _queueService = container.resolve(QueueService);
    protected _config = container.resolve(Config);

    public async loginWithMfa(req: Request, res: Response, next: NextFunction) {
        const { mfaLoginToken, oneTimePassword, userId } = req.body;

        if (!(await this._mfaManager.verifyLoginToken(userId, mfaLoginToken, req.ip))) {
            return forwardError(next, "invalidMfaToken", HttpStatus.UNAUTHORIZED);
        }

        if (!(await this._mfaManager.verifyTotp(userId, oneTimePassword))) {
            return forwardError(next, "invalidOneTimePassword", HttpStatus.UNAUTHORIZED);
        }

        this._mfaManager.revokeLoginToken(userId);

        this.sendTokens(req, res, userId);
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.cookies;
        await this._sessionManager.revokeSession(refreshToken);
        res.send({ result: true });
    }

    protected async sendTokens(req: Request, res: Response, userId: string) {
        const roles = await this._roleManager.getRoles(userId);
        const refreshToken = await this._sessionManager.issueRefreshToken(userId, req.ip, this.mapUserAgent(req.userAgent));
        const accessToken = this._jwtService.issueAccessToken(refreshToken, userId, roles);

        res.json({ refreshToken: refreshToken, accessToken: accessToken });
    }

    protected async handleUserLock(next: NextFunction, userId: string): Promise<boolean> {
        const lock = await this._lockManager.getActive(userId);
        if (lock) {
            const errors: ErrorResponse = {
                id: "userLockedOut",
                data: { reason: lock.reason },
            };
            forwardError(next, errors, HttpStatus.FORBIDDEN);
            return false;
        }
        return true;
    }

    protected async handleMfa(req: Request, res: Response, userId: string): Promise<boolean> {
        const mfaMethod = await this._mfaManager.getActiveMethod(userId);
        if (mfaMethod !== MfaMethod.none) {
            this.sendMfaLoginToken(req, res, userId);
            return false;
        }
        return true;
    }

    protected async pushNewUser(body: RequestBody, credentials?: Credentials) {
        const user: any = {};
        for (const fieldName of Object.keys(this._config.additionalFields.registerEndpoint)) {
            user[fieldName] = (body as any)[fieldName];
        }
        if (credentials) {
            Object.assign(user, credentials);
        }
        this._queueService.pushNewUser(user);
    }

    private async sendMfaLoginToken(req: Request, res: Response, userId: string) {
        const response = await this._mfaManager.issueLoginToken(userId, req.ip);
        return res.json({ user: { id: userId }, mfaLoginToken: { value: response.token, expiresAt: response.expiresAt } });
    }

    private mapUserAgent(userAgent: IUAParser.IResult) {
        const ua: UserAgent = {
            browser: userAgent.browser.name,
            os: userAgent.os.name,
            osVersion: userAgent.os.version,
        };
        return ua;
    }
}
