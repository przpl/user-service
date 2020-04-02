import { Entity, BaseEntity, PrimaryColumn, Column, OneToOne, JoinColumn } from "typeorm";

import { UserEntity } from "./userEntity";

export enum ExternalLoginProvider {
    facebook = 0,
    google = 1,
}

@Entity({ name: "external-login" })
export class ExternalLoginEntity extends BaseEntity {
    constructor(userId: string, externalUserId: string, email: string, provider: ExternalLoginProvider) {
        super();
        this.userId = userId;
        this.externalUserId = externalUserId;
        this.email = email;
        this.provider = provider;
    }

    @PrimaryColumn()
    externalUserId: string;

    @Column()
    userId: string;

    @OneToOne(type => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ type: "smallint" })
    provider: number;

    @Column({ nullable: true })
    email: string;
}
