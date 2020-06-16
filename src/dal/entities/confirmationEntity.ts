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

    @Column()
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column()
    code: string;

    @Column({ type: "smallint" })
    type: number;

    @Column({ type: "smallint", default: 0 })
    sentCount: number;

    @Column({ type: "timestamp" })
    lastSendRequestAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
