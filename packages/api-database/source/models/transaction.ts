import { Column, Entity } from "typeorm";

@Entity({
    name: "transactions",
})
export class Transaction {
    @Column({
        primary: true,
        type: "varchar",
        // TODO: length depends on hash size...
        // length: 64,
    })
    public id!: string;

    @Column({
        type: "smallint",
        nullable: false,
    })
    public version!: number;

    @Column({
        type: "smallint",
        nullable: false,
    })
    public type!: number;

    @Column({
        type: "integer",
        nullable: false,
        default: 1,
    })
    public typeGroup!: number;

    @Column({
        type: "varchar",
        nullable: false,
        // TODO: length depends on hash size..., also consider only storing height to save size since hash can be retrieved via join
        // length: 64,        
    })
    public blockId!: string;

    @Column({
        type: "integer",
        nullable: false,
    })
    public blockHeight!: number;

    @Column({
        type: "smallint",
        nullable: false,
    })
    public sequence!: number;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public timestamp!: number;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public nonce!: string;

    @Column({
        type: "varchar",
        nullable: false,
        // TODO: length depends on public key size...
        // length: 66,
    })
    public senderPublicKey!: string;

    @Column({
        default: undefined,
    })
    public recipientId!: string;

    @Column({
        type: "bytea",
        default: undefined,
        nullable: true,
    })
    public vendorField: string | undefined;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public amount!: string;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public fee!: string;

    // TODO: do we need this since client can calculate it?
    // @Column({
    //     type: "bytea",
    //     nullable: false,
    // })
    // public serialized!: Buffer;

    @Column({
        type: "jsonb",
        nullable: true,
        default: undefined,
        // TODO: separate tables for 1:n assets
    })
    public asset!: Record<string, any> | undefined;
}
