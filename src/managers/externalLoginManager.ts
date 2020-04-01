import { getRepository } from "typeorm";
import { singleton } from "tsyringe";

import { ExternalLoginEntity, ExternalLoginProvider } from "../dal/entities/externalLoginEntity";

@singleton()
export class ExternalLoginManager {
    private _repo = getRepository(ExternalLoginEntity);

    public async create(userId: string, externalUserId: string, email: string, provider: ExternalLoginProvider) {
        const login = new ExternalLoginEntity(externalUserId, userId, provider, email);
        await login.save();
    }

    public async get(externalUserId: string, provider: ExternalLoginProvider): Promise<string> {
        const entity = await this._repo.findOne({ externalUserId: externalUserId, provider: provider }); // sarch also by provider to make sure there aren't two different users across platforms with same user id
        if (!entity) {
            return null;
        }
        return entity.userId;
    }
}
