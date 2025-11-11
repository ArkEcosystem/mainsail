import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { ByteBuffer, validatorSetUnpack } from "@mainsail/utils";

@injectable()
export class CommitFactory implements Contracts.Crypto.CommitFactory {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Commit.Deserializer)
	private readonly commitDeserializer!: Contracts.Crypto.CommitDeserializer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Commit.ProofSize)
	private readonly proofSize!: () => number;

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.Commit> {
		const buffer = ByteBuffer.fromBuffer(buff);

		const proofBuffer = buffer.readBytes(this.proofSize());
		const proof = await this.commitDeserializer.deserializeCommitProof(proofBuffer);

		const block = await this.blockFactory.fromBytes(buffer.getRemainder());

		return {
			block,
			proof,
			serialized: buff.toString("hex"),
		};
	}

	public async fromStorage(data: Contracts.Evm.CommitStorageData): Promise<Contracts.Crypto.Commit> {
		const block = await this.blockFactory.fromStorage(data.header, data.transactions);

		const { roundValidators } = this.configuration.getMilestone(block.header.number);

		return {
			block,
			proof: {
				round: data.proof.round,
				signature: data.proof.signature,
				validators: validatorSetUnpack(data.proof.validatorSet, roundValidators),
			},
			serialized: "",
		};
	}

	public async fromJson(json: Contracts.Crypto.CommitJson): Promise<Contracts.Crypto.Commit> {
		const block = await this.blockFactory.fromJson(json.block);
		return {
			block,
			proof: json.proof,
			serialized: json.serialized,
		};
	}
}
