import { Entity, BaseEntity, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "role" })
export class RoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @PrimaryColumn()
    role: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
