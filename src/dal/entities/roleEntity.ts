import { Entity, BaseEntity, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "role" })
export class RoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string; // ManyToOne

    @PrimaryColumn()
    role: string;

    // TODO - who granted role to the user

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
