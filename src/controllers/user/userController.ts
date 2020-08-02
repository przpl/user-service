import { Request, Response, NextFunction } from "express";
import { container, singleton } from "tsyringe";
import moment from "moment";

import { JwtService } from "../../services/jwtService";
import { SessionManager } from "../../managers/sessionManager";
import { UserAgent } from "../../interfaces/userAgent";
import { RoleManager } from "../../managers/roleManager";
import { LockManager } from "../../managers/lockManager";
import { MfaMethod } from "../../dal/entities/mfaEntity";
import { MfaManager, MfaVerificationResult } from "../../managers/mfaManager";
import { RequestBody } from "../../types/express/requestBody";
import { Credentials } from "../../models/credentials";
import { Config } from "../../utils/config/config";
import { MessageBroker } from "../../services/messageBroker";
import * as errors from "../commonErrors";
import { captureExceptionWithSentry } from "../../utils/sentryUtils";
import SecurityLogger from "../../utils/securityLogger";
import { Session } from "../../models/session";
import { isNullOrUndefined } from "util";
import { REFRESH_TOKEN_COOKIE_NAME } from "../../utils/globalConsts";

@singleton()
export default class UserController {
    protected _sessionManager = container.resolve(SessionManager);
    protected _roleManager = container.resolve(RoleManager);
    protected _lockManager = container.resolve(LockManager);
    protected _mfaManager = container.resolve(MfaManager);
    protected _jwtService = container.resolve(JwtService);
    protected _queueService = container.resolve(MessageBroker);
    protected _config = container.resolve(Config);
    protected _securityLogger = container.resolve(SecurityLogger);

    public async loginWithMfa(req: Request, res: Response, next: NextFunction) {
        const { mfaLoginToken, oneTimePassword, userId } = req.body;

        if ((await this._mfaManager.verifyLoginToken(userId, mfaLoginToken, req.ip)) === false) {
            this._securityLogger.error(`Invalid login token for user ${userId}`);
            return errors.invalidMfaToken(next);
        }

        const verificationResult = await this._mfaManager.verifyTotp(userId, oneTimePassword);
        if (verificationResult === MfaVerificationResult.limitExceeded) {
            this._securityLogger.warn(`MFA invalid limit exceeded for user ${userId}`);
            return errors.mfaLimitExceeded(next);
        }
        if (verificationResult === MfaVerificationResult.invalidPassword) {
            this._securityLogger.warn(`Invalid OTP for user ${userId}`);
            return errors.invalidOneTimePassword(next);
        }

        this._mfaManager.revokeLoginToken(userId);

        this.sendTokens(req, res, userId);
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        let removedSession: Session;
        try {
            removedSession = await this._sessionManager.revokeSession(req.cookies[REFRESH_TOKEN_COOKIE_NAME]);
        } catch (error) {
            captureExceptionWithSentry(error, req.authenticatedUser);
        }

        if (removedSession) {
            this._securityLogger.info(
                `User ${removedSession.userId} session revoked by ${req.ip}. Created by: ${removedSession.createIp} at ${moment(
                    removedSession.lastUseAt
                ).unix()}, last refresh by ${removedSession.lastRefreshIp}`
            );
        }
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);

        res.send({ result: true });
    }

    protected async sendTokens(req: Request, res: Response, userId: string) {
        const roles = await this._roleManager.getRoles(userId);
        const refreshToken = await this._sessionManager.issueRefreshToken(userId, req.ip, this.mapUserAgent(req.userAgent));
        const accessToken = this._jwtService.issueAccessToken(refreshToken, userId, roles);
        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            path: "/",
            sameSite: "lax",
            expires: moment().add(2, "years").toDate(),
            secure: req.hostname !== "localhost",
            httpOnly: true,
        });

        res.json({ accessToken });
    }

    protected async handleUserLock(next: NextFunction, userId: string): Promise<boolean> {
        const lock = await this._lockManager.getActive(userId);
        if (lock) {
            errors.userLockedOut(next, lock.reason);
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

    protected async pushNewUser(id: string, body: RequestBody, credentials?: Credentials) {
        const user: any = { id };
        for (const fieldName of Object.keys(this._config.additionalFields.registerEndpoint)) {
            user[fieldName] = (body as any)[fieldName];
        }
        if (credentials) {
            Object.assign(user, credentials.getAll());
        }
        for (const fieldName of Object.keys(user)) {
            if (isNullOrUndefined(user[fieldName])) {
                delete user[fieldName];
            }
        }
        this._queueService.publishNewUser(user);
    }

    private async sendMfaLoginToken(req: Request, res: Response, userId: string) {
        const response = await this._mfaManager.issueLoginToken(userId, req.ip);
        return res.json({ user: { id: userId }, mfaLoginToken: { value: response.token, expiresAt: response.expiresAt } });
    }

    private mapUserAgent(userAgent: IUAParser.IResult): UserAgent {
        if (!userAgent) {
            return {
                browser: "",
                os: "",
                osVersion: "",
            };
        }

        return {
            browser: userAgent.browser.name,
            os: userAgent.os.name,
            osVersion: userAgent.os.version,
        };
    }
}
