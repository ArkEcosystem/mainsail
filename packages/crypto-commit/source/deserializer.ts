import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.CommitBlockDeserializer {
    @inject(Identifiers.Cryptography.Serializer)
    private readonly serializer!: Contracts.Serializer.Serializer;

    @inject(Identifiers.Cryptography.Commit.Serializer)
    private readonly commitSerializer!: Contracts.Crypto.CommitBlockSerializer;

    public async deserializeCommit(serialized: Buffer): Promise<Contracts.Crypto.BlockCommit> {
        const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

        const commit = {} as Contracts.Crypto.BlockCommit;

        await this.serializer.deserialize<Contracts.Crypto.BlockCommit>(buffer, commit, {
            length: this.commitSerializer.commitSize(),
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

        return commit;
    }
}