import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

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

    @PrimaryColumn({ type: "smallint" })
    provider: number;

    @Column()
    userId: string;

    @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ nullable: true })
    email: string;
}
