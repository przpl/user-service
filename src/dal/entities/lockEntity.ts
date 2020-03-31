import { Entity, Column, BaseEntity, CreateDateColumn, OneToOne, PrimaryColumn, JoinColumn } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "lock" })
export class LockEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @OneToOne(type => UserEntity, { primary: true })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ nullable: true })
    reason: string;

    @Column({ nullable: true, type: "timestamp" })
    until: Date;

    @CreateDateColumn({ type: "timestamp" })
    at: Date;

    @Column()
    by: string;
}
