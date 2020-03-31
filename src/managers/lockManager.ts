import { getRepository } from "typeorm";
import { singleton } from "tsyringe";

import { LockEntity } from "../dal/entities/lockEntity";
import { toUnixTimestampS, unixTimestampS } from "../utils/timeUtils";
import { UserNotExistsException } from "../exceptions/userExceptions";

@singleton()
export class LockManager {
    private _repo = getRepository(LockEntity);

    public async getReason(userId: string): Promise<string> {
        const entity = await this._repo.findOne({ where: { userId: userId } });
        if (!entity) {
            return null;
        }

        if (entity.until && toUnixTimestampS(entity.until) >= unixTimestampS()) {
            return entity.reason;
        }

        return null;
    }

    public async lock(userId: string, until: Date, reason: string) {
        const user = await this._repo.findOne({ where: { userId: userId } });
        if (!user) {
            throw new UserNotExistsException();
        }
        user.until = until;
        user.reason = reason;
        await user.save();
    }

    public async unlock(userId: string) {
        const user = await this._repo.findOne({ where: { userId: userId } });
        if (!user) {
            throw new UserNotExistsException();
        }
        user.until = null;
        await user.save();
    }
}
