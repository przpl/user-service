import { Entity, Column, BaseEntity, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    constructor(id: string) {
        super();
        this.id = id;
    }

    @PrimaryColumn()
    id: string;

    @Column({ type: "smallint", default: 0 })
    activeSessions: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
