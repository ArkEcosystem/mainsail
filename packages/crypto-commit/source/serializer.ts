import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.CommitSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	public proofSize(): number {
		return (
			4 + // round
			+this.messageSerializer.lockProofSize()
		);
	}

	public async serializeCommitProof(commit: Contracts.Crypto.CommitProof): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.CommitProof>(commit, {
			length: this.proofSize(),
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
			skip: 0,
		});
	}

	public async serializeCommit(commit: Contracts.Crypto.CommitSerializable): Promise<Buffer> {
		const serializedProof = await this.serializeCommitProof(commit.proof);
		const serializedBlock = Buffer.from(commit.block.serialized, "hex");
		return Buffer.concat([serializedProof, serializedBlock]);
	}
}
