import { Column, Entity } from "typeorm";

@Entity({
    name: "blocks",
})
export class Block {
    @Column({
        primary: true,
        type: "varchar",
        // TODO: length depends on hash size...
        // length: 64,
    })
    public readonly id!: string;

    @Column({
        type: "smallint",
    })
    public readonly version!: number;

    @Column({
        type: "bigint",
        nullable: false,
        unique: true,
    })
    public readonly timestamp!: number;

    @Column({
        type: "varchar",
        unique: true,
        // TODO: length depends on hash size...
        // length: 64,
    })
    public readonly previousBlock!: string;

    @Column({
        type: "integer",
        nullable: false,
        unique: true,
    })
    public readonly height!: number;

    @Column({
        type: "integer",
        nullable: false,
    })
    public readonly numberOfTransactions!: number;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public readonly totalAmount!: string;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public readonly totalFee!: string;

    @Column({
        type: "bigint",
        nullable: false,
    })
    public readonly reward!: string;

    @Column({
        type: "integer",
        nullable: false,
    })
    public readonly payloadLength!: number;

    @Column({
        type: "varchar",
        nullable: false,
        // TODO: length depends on hash size...
        // length: 64,
    })
    public readonly payloadHash!: string;

    @Column({
        type: "varchar",
        nullable: false,
        // TODO: length depends on public key size...
        // length: 66,
    })
    public readonly generatorPublicKey!: string;

    @Column({
        type: "varchar",
        nullable: false,
        // TODO: length depends on signature size...
        // length: 256,
    })
    public readonly blockSignature!: string;
}
