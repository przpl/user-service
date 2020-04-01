import { Entity, Column, BaseEntity, CreateDateColumn, OneToOne, PrimaryColumn, JoinColumn } from "typeorm";

import { UserEntity } from "./userEntity";

export enum MfaMethod {
    none = 0,
    code = 1,
    email = 2,
    sms = 3,
}

@Entity({ name: "mfa" })
export class MfaEntity extends BaseEntity {
    constructor(userId: string, method: MfaMethod, secret: string, ip: string) {
        super();
        this.userId = userId;
        this.method = method;
        this.secret = secret;
        this.ip = ip;
    }

    @PrimaryColumn()
    userId: string;

    @OneToOne(type => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ type: "smallint" })
    method: number;

    @Column({ default: false })
    enabled: boolean;

    @Column()
    secret: string;

    @Column()
    ip: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}