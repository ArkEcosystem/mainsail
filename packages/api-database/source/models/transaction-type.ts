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
        nullable: false,
        type: "jsonb",
    })
    public schema!: Record<string, any>;
}
