import cryptoRandomString from "crypto-random-string";
import { singleton } from "tsyringe";

import { USER_ID_LENGTH } from "../utils/globalConsts";
import { UserEntity } from "../dal/entities/userEntity";

@singleton()
export class UserManager {
    public async create(): Promise<string> {
        const entity = new UserEntity(this.generateUserId());
        await entity.save();
        return entity.id;
    }

    private generateUserId(): string {
        return cryptoRandomString({ length: USER_ID_LENGTH, type: "base64" })
            .replace("+", "0")
            .replace("/", "1");
    }
}
