import { Column, Entity } from "typeorm";

@Entity({
    name: "transaction_types",
})
export class TransactionType {
    @Column({
        primary: true,
        type: "smallint",
    })
    public type!: number;

    @Column({
        primary: true,
        type: "integer",
    })
    public typeGroup!: number;

    @Column({
        primary: true,
        type: "smallint",
    })
    public version!: number;

    @Column({
        type: "varchar",
        nullable: false,
    })
    public key!: string;

    @Column({
        type: "jsonb",
        nullable: false,
    })
    public schema!: Record<string, any>;
}
