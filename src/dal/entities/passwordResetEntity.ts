import { Entity, BaseEntity, CreateDateColumn, Column, OneToOne, JoinColumn, PrimaryColumn } from "typeorm";

import { UserEntity } from "./userEntity";

export enum PasswordResetMethod {
    email = 0,
    phone = 1,
}

@Entity({ name: "password-reset" })
export class PasswordResetEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @OneToOne(type => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column()
    code: string;

    @Column()
    method: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
