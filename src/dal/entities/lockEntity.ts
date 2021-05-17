import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "lock" })
export class LockEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @OneToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ nullable: true })
    reason: string;

    @Column({ nullable: true })
    by: string;

    @Column({ type: "timestamp" })
    until: Date;

    @CreateDateColumn({ type: "timestamp" })
    at: Date;
}
