import { getRepository } from "typeorm";

import { RoleEntity } from "../dal/entities/roleEntity";

export class RoleManager {
    private _roleRepo = getRepository(RoleEntity);

    public async getRoles(userId: string): Promise<string[]> {
        const roles = await this._roleRepo.find({ where: { userId: userId } });
        return roles.map(i => i.role);
    }
}
