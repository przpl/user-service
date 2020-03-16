import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";

import { forwardError } from "../utils/expressUtils";
import { ErrorResponse } from "../interfaces/errorResponse";
import { UserManager } from "../managers/userManger";
import { UserExistsException, UserNotConfirmedException, UserNotExistsException, InvalidPasswordException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";
import { InvalidJwtTypeException, ExpiredResetCodeException } from "../exceptions/exceptions";
import { JwtService, RefreshToken } from "../services/jwtService";
import { ExternalUser } from "../middleware/passport";
import { ExternalLoginProvider } from "../dal/entities/externalLogin";
import { TwoFaMethod } from "../dal/entities/userEntity";
import { TwoFaService } from "../services/twoFaService";
import { unixTimestamp } from "../utils/timeUtils";

export default class UserController {
    constructor(private _userManager: UserManager, private _jwtService: JwtService, private _twoFaService: TwoFaService, private _appName: string) {}

    public async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;

        let user: User;
        try {
            user = await this._userManager.register(email, password);
        } catch (error) {
            const errorsList: ErrorResponse[] = [];
            let responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            if (error instanceof UserExistsException) {
                errorsList.push({
                    id: "userAlreadyExists",
                    message: `User with e-mail ${email} already exists.`,
                });
                responseCode = HttpStatus.BAD_REQUEST;
            }

            return forwardError(next, errorsList, responseCode, error);
        }

        // TODO notify other services about new user, send data to queue
        // const emailSig = this._userManager.getEmailSignature(user.email);
        // const newUser: any = {
        //     id: user.id,
        //     email: user.email,
        // };
        // for (const fieldName of Object.keys(this._jsonConfig.additionalFields.registerEndpoint)) {
        //     newUser[fieldName] = req.body[fieldName];
        // }

        res.json({ user });
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;
        let user: User;
        try {
            user = await this._userManager.login(email, password);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.UNAUTHORIZED;
            if (error instanceof UserNotExistsException || error instanceof InvalidPasswordException) {
                errors.push({ id: "invalidCredentials" });
            } else if (error instanceof UserNotConfirmedException) {
                errors.push({ id: "emailNotConfirmed" });
                responseCode = HttpStatus.FORBIDDEN;
            } else {
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return forwardError(next, errors, responseCode, error);
        }

        if (user.twoFaMethod !== TwoFaMethod.none) {
            const tokenTtl = 120;
            const token = await this._twoFaService.issueLoginToken(user.id, req.ip, tokenTtl);
            const expiresAt = unixTimestamp() + tokenTtl;
            const userProjection = {
                id: user.id,
                email: user.email,
            };
            return res.json({ user: userProjection, twoFaToken: { value: token, expiresAt: expiresAt } });
        }

        this.sendTokens(res, user);
    }

    public async loginWithTwoFa(req: Request, res: Response, next: NextFunction) {
        const { twoFaToken, oneTimePassword, userId } = req.body;

        if (!(await this._twoFaService.verifyLoginToken(userId, twoFaToken, req.ip))) {
            return forwardError(next, [{ id: "invalid2FaToken" }], HttpStatus.UNAUTHORIZED);
        }

        if (!(await this._twoFaService.verifyHtop(userId, oneTimePassword))) {
            return forwardError(next, [{ id: "invalidOneTimePassword" }], HttpStatus.UNAUTHORIZED);
        }

        this._twoFaService.revokeLoginToken(userId);

        const user = await this._userManager.getUserById(userId);
        this.sendTokens(res, user);
    }

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

    public async loginWithExternalProvider(req: Request, res: Response, next: NextFunction, provider: ExternalLoginProvider) {
        const externalUser = req.user as ExternalUser;

        let user: User;
        try {
            user = await this._userManager.loginOrRegisterExternalUser(externalUser.id, provider);
        } catch (error) {
            return forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, error);
        }

        // TODO notify other services about new user, send data to queue

        this.sendTokens(res, user);
    }

    public async changePassword(req: Request, res: Response, next: NextFunction) {
        const { oldPassword, password } = req.body;

        try {
            await this._userManager.changePassword(req.authenticatedUser.sub, oldPassword, password);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            if (error instanceof InvalidPasswordException) {
                errors.push({ id: "invalidOldPassword" });
                responseCode = HttpStatus.UNAUTHORIZED;
            }
            return forwardError(next, errors, responseCode, error);
        }

        res.json({ result: true });
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        const { email } = req.body;
        let code: string;
        try {
            code = await this._userManager.generatePasswordResetCode(email);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return res.json({ result: true });
            } else if (error instanceof UserNotConfirmedException) {
                return res.json({ result: true });
            }
            return forwardError(next, [], HttpStatus.INTERNAL_SERVER_ERROR, error);
        }

        res.json({ result: true });

        // TODO - send event, new password reset code was generated - backend can send email
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        const { code, password } = req.body;
        try {
            await this._userManager.resetPassword(code, password);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.BAD_REQUEST;
            if (error instanceof UserNotExistsException) {
                errors.push({ id: "invalidCode" });
            } else if (error instanceof ExpiredResetCodeException) {
                errors.push({ id: "codeExpired" });
            } else {
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return forwardError(next, errors, responseCode, error);
        }

        res.json({ result: true });
    }

    public async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.body;

        let decoded: RefreshToken;
        try {
            decoded = this._jwtService.decodeRefreshToken(refreshToken);
        } catch (error) {
            const errors: ErrorResponse[] = [];
            let responseCode = HttpStatus.BAD_REQUEST;
            if (error?.message.toLowerCase().includes("invalid signature")) {
                errors.push({ id: "invalidJwtSignature" });
            } else if (error instanceof InvalidJwtTypeException) {
                errors.push({ id: "invalidJwtType" });
            } else {
                responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return forwardError(next, errors, responseCode, error);
        }

        const accessToken = this._jwtService.issueAccessToken(decoded);
        res.json({ accessToken: accessToken });
    }

    // ? JWT should not be issued because broken email confirmation will enable attacker to issue tokens
    public async confirmEmail(req: Request, res: Response, next: NextFunction) {
        const { email, signature } = req.body;
        const sigCorrect = this._userManager.verifyEmailSignature(email, signature);
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

    private sendTokens(res: Response, user: User) {
        const refreshToken = this._jwtService.issueRefreshToken(user.id);
        const decoded = this._jwtService.decodeRefreshToken(refreshToken);
        const accessToken = this._jwtService.issueAccessToken(decoded);

        const userProjection = {
            id: user.id,
            email: user.email,
        };

        res.json({ user: userProjection, refreshToken: refreshToken, accessToken: accessToken });
    }
}
