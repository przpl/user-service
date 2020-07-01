import { singleton } from "tsyringe";
import { getRepository } from "typeorm";

import { UserEntity } from "../dal/entities/userEntity";
import { generateUserId } from "../services/generator";

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
        const user = await this._repo.findOne(id, { select: ["id"] }); // select [] always returns null
        return Boolean(user);
    }
}
