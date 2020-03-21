import { getRepository } from "typeorm";

import { SessionEntity } from "../dal/entities/sessionEntity";
import { CryptoService } from "../services/cryptoService";
import { UserEntity } from "../dal/entities/userEntity";
import { JsonConfig } from "../utils/config/jsonConfig";
import { isExpired } from "../utils/timeUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import nameof from "../utils/nameof";

export class SessionManager {
    private _userRepo = getRepository(UserEntity);
    private _sessionRepo = getRepository(SessionEntity);

    constructor(private _cryptoService: CryptoService, private _jsonConfig: JsonConfig) {}

    public async issueRefreshToken(userId: string): Promise<string> {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (user.activeSessions >= this._jsonConfig.security.session.maxPerUser) {
            await this.removeOldestSession(userId);
        } else {
            user.activeSessions++;
            await user.save();
        }

        const token = this._cryptoService.randomBytesInBase64(64);
        const session = new SessionEntity();
        session.token = token;
        session.userId = userId;
        session.lastUseAt = new Date();
        await session.save();

        return token;
    }

    public async refreshSessionAndGetUserId(refreshToken: string): Promise<string> {
        const session = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!session) {
            return null;
        }

        if (isExpired(session.lastUseAt, this._jsonConfig.security.session.inactivityLimitHours * 60 * 60)) {
            await this._sessionRepo.remove(session);
            await this._userRepo.decrement({ id: session.userId }, nameof<UserEntity>("activeSessions"), 1);
            throw new StaleRefreshTokenException();
        }

        session.lastUseAt = new Date();
        await session.save();
        return session.userId;
    }

    private async removeOldestSession(userId: string) {
        const sessions = await this._sessionRepo.find({ where: { userId: userId } });
        if (sessions.length === 0) {
            return;
        }
        let oldest = sessions[0];
        for (let i = 1; i < sessions.length; i++) {
            if (oldest.lastUseAt > sessions[i].lastUseAt) {
                oldest = sessions[i];
            }
        }
        await this._sessionRepo.remove(oldest);
    }
}
