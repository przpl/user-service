import { inject, singleton } from "tsyringe";
import { DataSource } from "typeorm";

import { UserEntity } from "../dal/entities/userEntity";
import { UserIdGenerator } from "../services/generators/userIdGenerator";
import { guardNotUndefinedOrNull } from "../utils/guardClauses";

@singleton()
export class UserManager {
    private _repo = this._dataSource.getRepository(UserEntity);

    constructor(@inject("UserIdGenerator") private _idGenerator: UserIdGenerator, private _dataSource: DataSource) {}

    public async create(username: string): Promise<string> {
        const id = this._idGenerator.generate(username);
        const entity = new UserEntity(id, username);
        await entity.save();
        return entity.id;
    }

    public async delete(id: string) {
        await this._repo.delete(id);
    }

    public async exists(id: string): Promise<boolean> {
        guardNotUndefinedOrNull(id);
        const user = await this._repo.findOne({ where: { id }, select: ["id"] }); // select [] always returns null
        return Boolean(user);
    }

    public async doesUsernameExist(username: string): Promise<boolean> {
        guardNotUndefinedOrNull(username);
        const user = await this._repo.findOne({ where: { username }, select: ["id"] });
        return Boolean(user);
    }
}
