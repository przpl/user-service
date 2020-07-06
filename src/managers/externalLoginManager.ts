import { getRepository } from "typeorm";
import { singleton } from "tsyringe";

import { ExternalLoginEntity, ExternalLoginProvider } from "../dal/entities/externalLoginEntity";
import { guardNotUndefinedOrNull } from "../utils/guardClauses";

@singleton()
export class ExternalLoginManager {
    private _repo = getRepository(ExternalLoginEntity);

    public async create(userId: string, externalUserId: string, email: string, provider: ExternalLoginProvider) {
        const entity = new ExternalLoginEntity(userId, externalUserId, email, provider);
        await entity.save();
    }

    public async getUserId(externalUserId: string, provider: ExternalLoginProvider): Promise<string> {
        guardNotUndefinedOrNull(externalUserId);

        const entity = await this._repo.findOne({ externalUserId: externalUserId, provider: provider }); // search also by provider to make sure there aren't two different users across platforms with same user id
        if (!entity) {
            return null;
        }
        return entity.userId;
    }
}
