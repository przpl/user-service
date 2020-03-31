import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryGeneratedColumn, OneToOne } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "lock" })
export class LockEntity extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    userId: string;

    @OneToOne(type => UserEntity)
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
