import { CryptoService } from "./cryptoService";
import { CacheDb } from "../dal/cacheDb";

export class TwoFaService {
    constructor(private _cache: CacheDb, private _cryptoService: CryptoService) {
        if (!_cache) {
            throw new Error("Cache is required.");
        }
        if (!_cryptoService) {
            throw new Error("Crypto service is required.");
        }
    }

    public async issueToken(userId: string, ip: string, ttlSeconds: number): Promise<string> {
        const token = this._cryptoService.randomHex(64);
        await this._cache.setTwoFaToken(userId, token, ip, ttlSeconds);
        return token;
    }

    public async verifyToken(userId: string, token: string, ip: string): Promise<boolean> {
        const twoFaToken = await this._cache.getTwoFaToken(userId);
        if (!twoFaToken) {
            return false;
        }

        const result = twoFaToken.token === token && twoFaToken.ip === ip;
        if (result) {
            await this._cache.removeTwoFaToken(userId);
        }

        return result;
    }
}
