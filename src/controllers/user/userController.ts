import { NextFunction, Request, Response } from "express";
import moment from "moment";
import { container, singleton } from "tsyringe";

import { MfaMethod } from "../../dal/entities/mfaEntity";
import { UserAgent } from "../../interfaces/userAgent";
import { LockManager } from "../../managers/lockManager";
import { MfaManager, MfaVerificationResult } from "../../managers/mfaManager";
import { RoleManager } from "../../managers/roleManager";
import { BaseSessionManager } from "../../managers/session/baseSessionManager";
import { Credentials } from "../../models/credentials";
import { Session } from "../../models/session";
import { JwtService } from "../../services/jwtService";
import { MessageBroker } from "../../services/messageBroker";
import { RequestBody } from "../../types/express/requestBody";
import { Config } from "../../utils/config/config";
import { SESSION_COOKIE_NAME } from "../../utils/globalConsts";
import { isNullOrUndefined } from "../../utils/isNullOrUndefined";
import { removeSessionCookie } from "../../utils/removeSessionCookie";
import SecurityLogger from "../../utils/securityLogger";
import { captureExceptionWithSentry } from "../../utils/sentryUtils";
import * as errors from "../commonErrors";

@singleton()
export default class UserController {
    protected _sessionManager = container.resolve<BaseSessionManager>(BaseSessionManager.name);
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

        this.respondWithSessionOrJwt(req, res, userId);
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        let removedSession: Session;
        try {
            removedSession = await this._sessionManager.removeSession(req.cookies[SESSION_COOKIE_NAME]);
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
        removeSessionCookie(res);

        res.send({ result: true });
    }

    protected async respondWithSessionOrJwt(req: Request, res: Response, userId: string) {
        const sessionCookie = await this._sessionManager.issueSession(userId, req.ip, this.mapUserAgent(req.userAgent));
        res.cookie(SESSION_COOKIE_NAME, sessionCookie, {
            path: "/",
            sameSite: this._config.session.cookie.sameSite,
            maxAge: this._config.session.TTLHours * 60 * 60 * 1000,
            secure: this._config.session.cookie.secure,
            httpOnly: true,
        });

        if (this._config.mode === "session") {
            res.send();
        } else if (this._config.mode === "jwt") {
            const roles = await this._roleManager.getRoles(userId);
            const accessToken = this._jwtService.issueAccessToken(sessionCookie, userId, roles);
            res.json({ accessToken });
        } else {
            throw new Error("Unknown mode.");
        }
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

    private mapUserAgent(userAgent: UAParser.IResult): UserAgent {
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
