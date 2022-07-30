import moment from "moment";
import assert from "node:assert";
import { singleton } from "tsyringe";
import { DataSource } from "typeorm";

import { LockEntity } from "../dal/entities/lockEntity";
import { Lock } from "../models/lock";

@singleton()
export class LockManager {
    private _repo = this._dataSource.getRepository(LockEntity);

    constructor(private _dataSource: DataSource) {}

    public async getActive(userId: string): Promise<Lock> {
        const entity = await this.getByUserId(userId);
        if (!entity || this.isLockExpired(entity)) {
            return null;
        }

        return this.toLockModel(entity);
    }

    public async lock(userId: string, until: Date, reason: string, by: string) {
        let entity = await this.getByUserId(userId);
        if (!entity) {
            entity = new LockEntity();
            entity.userId = userId;
        }
        entity.until = until;
        entity.reason = reason;
        entity.by = by;
        entity.at = new Date();

        await entity.save();
    }

    public async unlock(userId: string): Promise<boolean> {
        const result = await this._repo.delete({ userId: userId });
        return result.affected > 0;
    }

    private isLockExpired(lock: LockEntity) {
        return moment().isAfter(lock.until);
    }

    private getByUserId(userId: string): Promise<LockEntity> {
        assert(userId);
        return this._repo.findOneBy({ userId });
    }

    private toLockModel(entity: LockEntity): Lock {
        return new Lock(entity.userId, entity.reason);
    }
}
