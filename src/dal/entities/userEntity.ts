import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn } from "typeorm";

export enum TwoFaMethod {
    none = 0,
    code = 1,
    email = 2,
    sms = 3,
}

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true, nullable: true })
    email: string;

    @Column({ nullable: true })
    passwordHash: string;

    @Column({ default: false })
    emailConfirmed: boolean;

    @Column({ type: "smallint", default: TwoFaMethod.none })
    twoFaMethod: number;

    @Column({ nullable: true })
    twoFaSecret: string;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;
}
