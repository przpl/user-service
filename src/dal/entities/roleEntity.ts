import { Entity, BaseEntity, PrimaryColumn } from "typeorm";

@Entity({ name: "role" })
export class RoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @PrimaryColumn()
    role: string;
}
