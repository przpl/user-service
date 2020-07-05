import { singleton } from "tsyringe";
import { getRepository } from "typeorm";

import { UserEntity } from "../dal/entities/userEntity";
import { generateUserId } from "../services/generator";
import { guardNotUndefinedOrNull } from "../utils/guardClauses";

@singleton()
export class UserManager {
    private _repo = getRepository(UserEntity);

    public async create(): Promise<string> {
        const entity = new UserEntity(generateUserId());
        await entity.save();
        return entity.id;
    }

    public async delete(id: string) {
        await this._repo.delete(id);
    }

    public async exists(id: string): Promise<boolean> {
        guardNotUndefinedOrNull(id);
        const user = await this._repo.findOne(id, { select: ["id"] }); // select [] always returns null
        return Boolean(user);
    }
}
