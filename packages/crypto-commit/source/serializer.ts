import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

@injectable()
export class Serializer implements Contracts.Crypto.CommitSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.BlockSerializer;

	@inject(Identifiers.Cryptography.Commit.ProofSize)
	private readonly proofSize!: () => number;

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

		let serializedBlock: Buffer = Buffer.from(commit.block.serialized, "hex");
		if (serializedBlock.byteLength === 0) {
			serializedBlock = await this.blockSerializer.serializeWithTransactions(commit.block.data);
		}

		return Buffer.concat([serializedProof, serializedBlock]);
	}
}
