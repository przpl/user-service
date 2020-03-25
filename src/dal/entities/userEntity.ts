import { Entity, Column, BaseEntity, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from "typeorm";

export enum MfaMethod {
    none = 0,
    code = 1,
    email = 2,
    sms = 3,
}

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    constructor(id: string) {
        super();
        this.id = id;
    }

    @PrimaryColumn()
    id: string;

    @Column({ unique: true, nullable: true })
    email: string;

    @Column({ nullable: true })
    passwordHash: string;

    @Column({ default: false })
    emailConfirmed: boolean;

    @Column({ type: "smallint", default: MfaMethod.none })
    mfaMethod: number;

    @Column({ nullable: true })
    mfaSecret: string;

    @Column({ type: "smallint", default: 0 })
    activeSessions: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

    public isLocalAccount(): boolean {
        return Boolean(this.passwordHash);
    }
}
