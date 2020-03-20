import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError, forwardInternalError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import { UserExistsException, UserNotConfirmedException, UserNotExistsException, InvalidPasswordException } from "../../exceptions/userExceptions";
import { User } from "../../interfaces/user";
import { JwtService } from "../../services/jwtService";
import { MfaMethod } from "../../dal/entities/userEntity";
import { MfaService } from "../../services/mfaService";
import UserController from "./userController";
import { SessionManager } from "../../managers/sessionManager";

export default class LocalUserController extends UserController {
    constructor(private _userManager: UserManager, sessionManager: SessionManager, jwtService: JwtService, private _mfaService: MfaService) {
        super(jwtService, sessionManager);
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;

        let user: User;
        try {
            user = await this._userManager.register(email, password);
        } catch (error) {
            if (error instanceof UserExistsException) {
                return forwardError(next, "userAlreadyExists", HttpStatus.BAD_REQUEST);
            }
            return forwardInternalError(next, error);
        }

        // TODO notify other services about new user, send data to queue
        // const emailSig = this._userManager.getEmailSignature(user.email).toUpperCase();
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
        const { email, password } = req.body;
        let user: User;
        try {
            user = await this._userManager.login(email, password);
        } catch (error) {
            if (error instanceof UserNotExistsException || error instanceof InvalidPasswordException) {
                return forwardError(next, "invalidCredentials", HttpStatus.UNAUTHORIZED);
            } else if (error instanceof UserNotConfirmedException) {
                return forwardError(next, "emailNotConfirmed", HttpStatus.FORBIDDEN);
            }
            return forwardError(next, [], HttpStatus.FORBIDDEN, error);
        }

        if (user.mfaMethod !== MfaMethod.none) {
            return this.sendMfaLoginToken(req, res, user);
        }

        this.sendTokens(res, user);
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
        this.sendTokens(res, user);
    }

    private async sendMfaLoginToken(req: Request, res: Response, user: User) {
        const response = await this._mfaService.issueLoginToken(user.id, req.ip);
        return res.json({ user: this.mapUser(user), mfaLoginToken: { value: response.token, expiresAt: response.expiresAt } });
    }
}
