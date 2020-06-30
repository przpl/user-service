import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "./userEntity";

@Entity({ name: "session" })
export class SessionEntity extends BaseEntity {
    @PrimaryColumn()
    token: string;

    @Column()
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column()
    createIp: string;

    @Column()
    lastRefreshIp: string;

    @Column({ nullable: true })
    browser: string;

    @Column({ nullable: true })
    os: string;

    @Column({ nullable: true })
    osVersion: string;

    @Column({ type: "timestamp" })
    lastUseAt: Date;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
