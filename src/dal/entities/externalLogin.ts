import { Entity, BaseEntity, PrimaryColumn, Column, OneToOne, JoinColumn } from "typeorm";

import { UserEntity } from "./userEntity";

export enum ExternalLoginProvider {
    facebook = 0,
    google = 1,
}

@Entity({ name: "external-login" })
export class ExternalLoginEntity extends BaseEntity {
    constructor(externalUserId: string, userId: string, provider: ExternalLoginProvider, email: string) {
        super();
        this.externalUserId = externalUserId;
        this.userId = userId;
        this.provider = provider;
        this.email = email;
    }

    @PrimaryColumn()
    externalUserId: string;

    @Column()
    userId: string;

    @OneToOne(type => UserEntity, { primary: true })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ type: "smallint" })
    provider: number;

    @Column({ nullable: true })
    email: string;
}
