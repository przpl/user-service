import moment from "moment";
import { singleton } from "tsyringe";

import { CacheDb } from "../../dal/cacheDb";
import { SessionEntity } from "../../dal/entities/sessionEntity";
import { JwtService } from "../../services/jwtService";
import Env from "../../utils/config/env";
import { TimeSpan } from "../../utils/timeSpan";
import { SessionCacheStrategy } from "./sessionCacheStrategy";

const ACCESS_TOKEN_EXPIRE_OFFSET = 10; // 10 seconds of additional offset to be 100% sure access token is expired

@singleton()
export class JwtSessionCacheStrategy implements SessionCacheStrategy {
    private _tokenTTL: TimeSpan;

    constructor(private _cacheDb: CacheDb, private _jwtService: JwtService, env: Env) {
        this._tokenTTL = TimeSpan.fromMinutes(env.tokenTTLMinutes);
    }

    public async set(): Promise<void> {
        throw new Error("Not implemented.");
    }

    public async remove(session: SessionEntity): Promise<void> {
        await this.revokeAccessToken(session);
    }

    public async removeMany(sessions: SessionEntity[]): Promise<void> {
        for (const session of sessions) {
            await this.revokeAccessToken(session);
        }
    }

    public async removeManyByIds(ids: string[]): Promise<void> {
        throw new Error("Not implemented.");
    }

    private async revokeAccessToken(session: SessionEntity) {
        const secondsToExpire = this.getSecondsToExpire(session);
        if (secondsToExpire > ACCESS_TOKEN_EXPIRE_OFFSET * -1) {
            const ref = this._jwtService.getSessionRef(session.id);
            const secondsToExpireWithOffset = TimeSpan.fromSeconds(secondsToExpire + ACCESS_TOKEN_EXPIRE_OFFSET);
            await this._cacheDb.revokeAccessToken(session.userId, ref, secondsToExpireWithOffset);
        }
    }

    private getSecondsToExpire(session: SessionEntity): number {
        const expiresAt = moment(session.lastUseAt).add(this._tokenTTL.seconds, "seconds");
        return expiresAt.diff(moment(), "seconds");
    }
}
