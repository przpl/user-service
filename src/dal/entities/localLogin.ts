import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, OneToOne } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "local-login" })
export class LocalLoginEntity extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    userId: string;

    @OneToOne(type => UserEntity)
    user: UserEntity;

    @Column({ unique: true, nullable: true })
    email: string;

    @Column({ default: false })
    emailConfirmed: boolean;

    @Column({ unique: true, nullable: true })
    username: string;

    @Column({ nullable: true })
    phoneCode: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ default: false })
    phoneConfirmed: boolean;

    @Column({ nullable: true })
    passwordHash: string;
}
