import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.CommitBlockSerializer {
    @inject(Identifiers.Cryptography.Serializer)
    private readonly serializer!: Contracts.Serializer.Serializer;

    @inject(Identifiers.Cryptography.Message.Serializer)
    private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

    public commitSize(): number {
        return (
            4 + // round
            +this.messageSerializer.lockProofSize()
        );
    }

    public async serializeCommit(commit: Contracts.Crypto.BlockCommit): Promise<Buffer> {
        return this.serializer.serialize<Contracts.Crypto.BlockCommit>(commit, {
            length: this.commitSize(),
            skip: 0,
            schema: {
                round: {
                    type: "uint32",
                },
                signature: {
                    type: "consensusSignature",
                },
                validators: {
                    type: "validatorSet",
                },
            },
        });
    }

    public async serializeFull(committedBlock: Contracts.Crypto.CommittedBlockSerializable): Promise<Buffer> {
        const serializedCommit = await this.serializeCommit(committedBlock.commit);
        const serializedBlock = Buffer.from(committedBlock.block.serialized, "hex");
        return Buffer.concat([serializedCommit, serializedBlock]);
    }
}