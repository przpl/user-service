import cryptoRandomString from "crypto-random-string";
import { singleton } from "tsyringe";
import { getRepository } from "typeorm";

import { USER_ID_LENGTH } from "../utils/globalConsts";
import { UserEntity } from "../dal/entities/userEntity";

@singleton()
export class UserManager {
    private _repo = getRepository(UserEntity);

    public async create(): Promise<string> {
        const entity = new UserEntity(this.generateUserId());
        await entity.save();
        return entity.id;
    }

    public async exists(id: string): Promise<boolean> {
        const user = await this._repo.findOne({ where: { id: id }, select: [] });
        return Boolean(user);
    }

    private generateUserId(): string {
        return cryptoRandomString({ length: USER_ID_LENGTH, type: "base64" })
            .replace("+", "0")
            .replace("/", "1");
    }
}
