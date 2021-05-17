import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import { UserEntity } from "./userEntity";

export enum PasswordResetMethod {
    email = 0,
    phone = 1,
}

@Entity({ name: "password-reset" })
export class PasswordResetEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @OneToOne(() => UserEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: UserEntity;

    @Column()
    code: string;

    @Column()
    method: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
