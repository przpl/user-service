import { getRepository } from "typeorm";

import { SessionEntity } from "../dal/entities/sessionEntity";
import { CryptoService } from "../services/cryptoService";

export class SessionManager {
    private _sessionRepo = getRepository(SessionEntity);

    constructor(private _cryptoService: CryptoService) {}

    public async issueRefreshToken(userId: string): Promise<string> {
        const token = this._cryptoService.randomBytesInBase64(64);
        const session = new SessionEntity();
        session.token = token;
        session.userId = userId;
        session.lastUseAt = new Date();
        await session.save();

        return token;
    }

    public async getUserIdFromRefreshToken(refreshToken: string): Promise<string> {
        const session = await this._sessionRepo.findOne({ where: { token: refreshToken } });
        if (!session) {
            return null;
        }

        session.lastUseAt = new Date();
        await session.save();
        return session.userId;
    }
}
