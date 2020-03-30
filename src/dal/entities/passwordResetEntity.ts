import { Entity, BaseEntity, CreateDateColumn, PrimaryColumn, Column } from "typeorm";

export enum PasswordResetMethod {
    email = 0,
    phone = 1,
}

@Entity({ name: "password-reset" })
export class PasswordResetEntity extends BaseEntity {
    @PrimaryColumn()
    userId: string;

    @Column()
    code: string;

    @Column()
    method: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
