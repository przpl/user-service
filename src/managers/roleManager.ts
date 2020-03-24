import { getRepository } from "typeorm";

import { RoleEntity } from "../dal/entities/roleEntity";
import { SessionManager } from "./sessionManager";

export class RoleManager {
    private _roleRepo = getRepository(RoleEntity);

    constructor(private _sessionManager: SessionManager) {}

    public async addRole(userId: string, role: string) {
        const entity = new RoleEntity();
        entity.userId = userId;
        entity.role = role;
        await entity.save();
    }

    public async removeRole(userId: string, role: string) {
        const entity = await this._roleRepo.findOne({ where: { userId: userId, role: role } });
        if (!entity) {
            return;
        }
        await this._roleRepo.remove(entity);
        await this._sessionManager.revokeSession(userId);
    }

    public async getRoles(userId: string): Promise<string[]> {
        const roles = await this._roleRepo.find({ where: { userId: userId } });
        return roles.map(i => i.role);
    }
}
