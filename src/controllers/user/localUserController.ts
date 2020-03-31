import { Request, Response, NextFunction } from "express";
import HttpStatus from "http-status-codes";
import { singleton } from "tsyringe";

import { forwardError } from "../../utils/expressUtils";
import { UserManager } from "../../managers/userManger";
import { UserNotConfirmedException, UserNotExistsException } from "../../exceptions/userExceptions";
import { JwtService } from "../../services/jwtService";
import { MfaService } from "../../services/mfaService";
import UserController from "./userController";
import { SessionManager } from "../../managers/sessionManager";
import { QueueService } from "../../services/queueService";
import { RoleManager } from "../../managers/roleManager";
import { ErrorResponse } from "../../interfaces/errorResponse";
import { LocalLoginManager, LoginDuplicateType } from "../../managers/localLoginManager";
import { LoginModel } from "../../models/loginModel";
import { PhoneModel } from "../../models/phoneModel";
import { RequestBody } from "../../types/express/requestBody";
import { MfaManager } from "../../managers/mfaManager";
import { LocalLoginEntity } from "../../dal/entities/localLogin";
import { MfaMethod } from "../../dal/entities/mfaEntity";
import { LockManager } from "../../managers/lockManager";

@singleton()
export default class LocalUserController extends UserController {
    constructor(
        private _userManager: UserManager,
        sessionManager: SessionManager,
        roleManager: RoleManager,
        private queueService: QueueService,
        jwtService: JwtService,
        private _mfaService: MfaService,
        private _localLoginManager: LocalLoginManager,
        private _mfaManager: MfaManager,
        private _lockManager: LockManager
    ) {
        super(sessionManager, roleManager, jwtService);
    }

    public async register(req: Request, res: Response, next: NextFunction) {
        const login = this.mapDtoToLogin(req.body);
        const duplicateResult = await this._localLoginManager.isDuplicate(login);
        if (duplicateResult === LoginDuplicateType.email || duplicateResult === LoginDuplicateType.phone) {
            return forwardError(next, "userAlreadyExists", HttpStatus.BAD_REQUEST);
        }
        if (duplicateResult === LoginDuplicateType.username) {
            return forwardError(next, "usernameAlreadyUsed", HttpStatus.BAD_REQUEST);
        }

        const userId = await this._userManager.create();

        await this._localLoginManager.create(login, userId, req.body.password);

        // TODO send to queue phone confirmation code if needed
        // await this._emailManager.generateCode(user.id, user.email); // const emailCode
        // const newUser: any = {
        //     id: user.id,
        //     email: user.email,
        // };
        // for (const fieldName of Object.keys(this._jsonConfig.additionalFields.registerEndpoint)) {
        //     newUser[fieldName] = req.body[fieldName];
        // }

        res.json({ result: true });
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        const login = this.mapDtoToLogin(req.body);

        let authenticated: LocalLoginEntity = null;
        try {
            authenticated = await this._localLoginManager.authenticate(login, req.body.password);
        } catch (error) {
            if (error instanceof UserNotExistsException) {
                return forwardError(next, "invalidCredentials", HttpStatus.UNAUTHORIZED);
            } else if (error instanceof UserNotConfirmedException) {
                return forwardError(next, "emailNotConfirmed", HttpStatus.FORBIDDEN);
            }
            return forwardError(next, [], HttpStatus.FORBIDDEN, error);
        }

        if (!authenticated) {
            return forwardError(next, "invalidCredentials", HttpStatus.UNAUTHORIZED);
        }

        // TODO duplicated with externalUserController
        const lockReason = await this._lockManager.getReason(authenticated.userId);
        if (lockReason) {
            const errors: ErrorResponse = {
                id: "userLockedOut",
                data: { reason: lockReason },
            };
            return forwardError(next, errors, HttpStatus.FORBIDDEN);
        }

        const mfaMethod = await this._mfaManager.getActiveMethod(authenticated.userId);
        if (mfaMethod !== MfaMethod.none) {
            return this.sendMfaLoginToken(req, res, authenticated.userId);
        }

        this.sendTokens(req, res, authenticated.userId);
    }

    public async loginWithMfa(req: Request, res: Response, next: NextFunction) {
        const { mfaLoginToken, oneTimePassword, userId } = req.body;

        if (!(await this._mfaService.verifyLoginToken(userId, mfaLoginToken, req.ip))) {
            return forwardError(next, "invalidMfaToken", HttpStatus.UNAUTHORIZED);
        }

        if (!(await this._mfaManager.verifyHtop(userId, oneTimePassword))) {
            return forwardError(next, "invalidOneTimePassword", HttpStatus.UNAUTHORIZED);
        }

        this._mfaService.revokeLoginToken(userId);

        this.sendTokens(req, res, userId);
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        const { refreshToken } = req.cookies;
        await this._sessionManager.revokeSession(refreshToken);
        res.send({ result: true });
    }

    private async sendMfaLoginToken(req: Request, res: Response, userId: string) {
        const response = await this._mfaService.issueLoginToken(userId, req.ip);
        return res.json({ mfaLoginToken: { value: response.token, expiresAt: response.expiresAt } });
    }

    // TODO duplicate with password controller
    private mapDtoToLogin(body: RequestBody): LoginModel {
        const phoneDto = body.phone;
        let phone: PhoneModel = null;
        if (phoneDto && phoneDto.code && phoneDto.number) {
            phone = new PhoneModel(body.phone.code, body.phone.number);
        }
        return new LoginModel(body.email, body.username, phone);
    }
}
