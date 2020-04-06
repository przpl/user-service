import { Entity, BaseEntity, Column, OneToOne, PrimaryColumn, JoinColumn } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "local-login" })
export class LocalLoginEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @OneToOne(type => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column({ unique: true, nullable: true })
    username: string;

    @Column({ unique: true, nullable: true })
    email: string;

    @Column({ default: false })
    emailConfirmed: boolean;

    @Column({ nullable: true })
    phoneCode: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ default: false })
    phoneConfirmed: boolean;

    @Column({ nullable: true })
    passwordHash: string;
}
