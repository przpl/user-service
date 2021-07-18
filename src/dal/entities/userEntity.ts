import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "user" })
export class UserEntity extends BaseEntity {
    constructor(id: string, username?: string) {
        super();
        this.id = id;
        this.username = username;
    }

    @PrimaryColumn()
    id: string;

    @Column()
    username: string; // helpful with finding username duplicates between external and local accounts

    @Column("text", { array: true, default: "{}" })
    sessionIds: string[];

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}
