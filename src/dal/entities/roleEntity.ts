import { BaseEntity, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "role" })
export class RoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @PrimaryColumn()
    role: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
