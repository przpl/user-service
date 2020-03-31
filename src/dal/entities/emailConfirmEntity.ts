import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn, OneToOne, JoinColumn } from "typeorm";

import { UserEntity } from "./userEntity";

@Entity({ name: "email-confirmation" })
export class EmailConfirmEntity extends BaseEntity {
    @PrimaryColumn()
    email: string;

    @Column()
    userId: string;

    @OneToOne(type => UserEntity, { primary: true })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column()
    code: string;

    @Column({ type: "smallint", default: 0 })
    sentCount: number;

    @Column({ type: "timestamp" })
    lastSendRequestAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
