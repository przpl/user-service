import { getRepository } from "typeorm";

import { SessionEntity } from "../dal/entities/sessionEntity";
import { CryptoService } from "../services/cryptoService";
import { UserEntity } from "../dal/entities/userEntity";
import { JsonConfig } from "../utils/config/jsonConfig";
import { isExpired } from "../utils/timeUtils";
import { StaleRefreshTokenException } from "../exceptions/exceptions";
import nameof from "../utils/nameof";
import { TimeSpan } from "../utils/timeSpan";

export class SessionManager {
    private _userRepo = getRepository(UserEntity);
    private _sessionRepo = getRepository(SessionEntity);

    constructor(private _cryptoService: CryptoService, private _jsonConfig: JsonConfig) {}

    public async issueRefreshToken(userId: string): Promise<string> {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (user.activeSessions >= this._jsonConfig.security.session.maxPerUser) {
            const sessionsAfterRemoval = await this.removeOldestSession(userId, this._jsonConfig.security.session.maxPerUser);
            user.activeSessions = sessionsAfterRemoval;
        }

        user.activeSessions++;
        await user.save();

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

        if (isExpired(session.lastUseAt, TimeSpan.fromHours(this._jsonConfig.security.session.staleRefreshTokenAfterHours))) {
            await this._sessionRepo.remove(session);
            await this._userRepo.decrement({ id: session.userId }, nameof<UserEntity>("activeSessions"), 1);
            throw new StaleRefreshTokenException();
        }

        session.lastUseAt = new Date();
        await session.save();
        return session.userId;
    }

    private async removeOldestSession(userId: string, maxSessionsPerUser: number): Promise<number> {
        const sessions = await this._sessionRepo.find({ where: { userId: userId } });
        if (sessions.length < maxSessionsPerUser) {
            return;
        }
        const fromOldestToNewest = sessions.sort((a, b) => a.lastUseAt.getTime() - b.lastUseAt.getTime());
        let redundantSessionsCount = sessions.length - maxSessionsPerUser;
        redundantSessionsCount++; // we will create one sesion so we need to remove one more to make a place
        const sessionsToRemove = fromOldestToNewest.slice(0, redundantSessionsCount);
        await this._sessionRepo.remove(sessionsToRemove);

        return sessions.length - redundantSessionsCount;
    }
}
