import { getRepository } from "typeorm";

import { RoleEntity } from "../dal/entities/roleEntity";

export class RoleManager {
    private _roleRepo = getRepository(RoleEntity);

    public async addRole(userId: string, role: string) {
        const entity = new RoleEntity();
        entity.userId = userId;
        entity.role = role;
        await entity.save();
    }

    public async removeRole(userId: string, role: string): Promise<boolean> {
        const entity = await this._roleRepo.findOne({ where: { userId: userId, role: role } });
        if (!entity) {
            return false;
        }
        await this._roleRepo.remove(entity);
        return true;
    }

    public async getRoles(userId: string): Promise<string[]> {
        const roles = await this._roleRepo.find({ where: { userId: userId } });
        return roles.map(i => i.role);
    }
}
