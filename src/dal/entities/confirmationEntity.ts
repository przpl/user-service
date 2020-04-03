import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn, JoinColumn, ManyToOne } from "typeorm";

import { UserEntity } from "./userEntity";

export enum ConfirmationType {
    email = 0,
    phone = 1,
}

@Entity({ name: "confirmation" })
export class ConfirmationEntity extends BaseEntity {
    @PrimaryColumn()
    subject: string;

    @PrimaryColumn({ type: "smallint" })
    type: number;

    @Column()
    userId: string;

    @ManyToOne(type => UserEntity)
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
