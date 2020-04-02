import { getRepository } from "typeorm";
import { singleton } from "tsyringe";

import { RoleEntity } from "../dal/entities/roleEntity";
import { NotFoundException } from "../exceptions/userExceptions";

@singleton()
export class RoleManager {
    private _repo = getRepository(RoleEntity);

    public async addRole(userId: string, role: string) {
        const entity = new RoleEntity();
        entity.userId = userId;
        entity.role = role;
        try {
            await entity.save();
        } catch (error) {
            if ((error.detail as string).includes("not present in table")) {
                throw new NotFoundException();
            }
            throw error;
        }
    }

    public async removeRole(userId: string, role: string): Promise<boolean> {
        const result = await this._repo.delete({ userId: userId, role: role });
        return result.affected > 0;
    }

    public async getRoles(userId: string): Promise<string[]> {
        const roles = await this._repo.find({ where: { userId: userId } });
        return roles.map(i => i.role);
    }
}
