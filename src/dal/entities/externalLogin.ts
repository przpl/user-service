import { Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, PrimaryColumn, Column } from "typeorm";

export enum ExternalLoginProvider {
    facebook = 0,
    google = 1,
}

@Entity({ name: "external-login" })
export class ExternalLoginEntity extends BaseEntity {
    @PrimaryColumn()
    externalUserId: string;

    @Column({ type: "smallint" })
    provider: number;

    @Column({ nullable: true })
    email: string;

    @Column()
    userId: string; // TODO foreign key

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;
}
