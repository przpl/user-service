import { Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, PrimaryColumn, Column } from "typeorm";

export enum ExternalLoginProvider {
    facebook,
    google,
}

@Entity({ name: "external-login" })
export class ExternalLoginEntity extends BaseEntity {
    @PrimaryColumn()
    externalUserId: string;

    @PrimaryColumn("enum", { enum: ExternalLoginProvider })
    provider: ExternalLoginProvider;

    @Column("uuid")
    userId: string; // TODO foreign key

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;
}
