import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError, forwardInternalError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import {
    UserExistsException,
    UserNotConfirmedException,
    UserNotExistsException,
    InvalidPasswordException,
    UserLockedOutException,
} from "../../exceptions/userExceptions";
import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { MfaMethod } from "../../dal/entities/userEntity";
import { MfaService } from "../../services/mfaService";
import UserController from "./userController";
import { SessionManager } from "../../managers/sessionManager";
import { QueueService } from "../../services/queueService";
import { EmailManager } from "../../managers/emailManager";
import { RoleManager } from "../../managers/roleManager";
import { ErrorResponse } from "../../interfaces/errorResponse";

@singleton()
export default class LocalUserController extends UserController {
    constructor(
        private _userManager: UserManager,
        sessionManager: SessionManager,
        roleManager: RoleManager,
        private _emailManager: EmailManager,
        private queueService: QueueService,
        jwtService: JwtService,
        private _mfaService: MfaService
    ) {
        super(sessionManager, roleManager, jwtService);
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        let user: User;
        try {
            user = await this._userManager.register(req.body.email, req.body.username, req.body.password);
        } catch (error) {
            if (error instanceof UserExistsException) {
                return forwardError(next, "userAlreadyExists", HttpStatus.BAD_REQUEST);
            }
            return forwardInternalError(next, error);
        }

        await this._emailManager.generateCode(user.id, user.email); // const emailCode
        // const newUser: any = {
        //     id: user.id,
        //     email: user.email,
        // };
        // for (const fieldName of Object.keys(this._jsonConfig.additionalFields.registerEndpoint)) {
        //     newUser[fieldName] = req.body[fieldName];
        // }

        res.json({ user: this.mapUser(user) });
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        const { subject, password } = req.body;
        let user: User;
        try {
            user = await this._userManager.login(subject, password);
        } catch (error) {
            if (error instanceof UserNotExistsException || error instanceof InvalidPasswordException) {
                return forwardError(next, "invalidCredentials", HttpStatus.UNAUTHORIZED);
            } else if (error instanceof UserNotConfirmedException) {
                return forwardError(next, "emailNotConfirmed", HttpStatus.FORBIDDEN);
            } else if (error instanceof UserLockedOutException) {
                const errors: ErrorResponse = {
                    id: "userLockedOut",
                    data: { reason: (error as UserLockedOutException).reason },
                };
                return forwardError(next, errors, HttpStatus.FORBIDDEN);
            }
            return forwardError(next, [], HttpStatus.FORBIDDEN, error);
        }

        if (user.mfaMethod !== MfaMethod.none) {
            return this.sendMfaLoginToken(req, res, user);
        }

        this.sendTokens(req, res, user);
    }

    public async loginWithMfa(req: Request, res: Response, next: NextFunction) {
        const { mfaLoginToken, oneTimePassword, userId } = req.body;

        if (!(await this._mfaService.verifyLoginToken(userId, mfaLoginToken, req.ip))) {
            return forwardError(next, "invalidMfaToken", HttpStatus.UNAUTHORIZED);
        }

        if (!(await this._mfaService.verifyHtop(userId, oneTimePassword))) {
            return forwardError(next, "invalidOneTimePassword", HttpStatus.UNAUTHORIZED);
        }

        this._mfaService.revokeLoginToken(userId);

        const user = await this._userManager.getUserById(userId);
        this.sendTokens(req, res, user);
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.cookies;
        await this._sessionManager.revokeSession(refreshToken);
        res.send({ result: true });
    }

    private async sendMfaLoginToken(req: Request, res: Response, user: User) {
        const response = await this._mfaService.issueLoginToken(user.id, req.ip);
        return res.json({ user: this.mapUser(user), mfaLoginToken: { value: response.token, expiresAt: response.expiresAt } });
    }
}
