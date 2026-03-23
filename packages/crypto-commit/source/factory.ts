import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { MessageSchemaError } from "@mainsail/exceptions";
import { ByteBuffer, validatorSetUnpack } from "@mainsail/utils";

@injectable()
export class CommitFactory implements Contracts.Crypto.CommitFactory {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Commit.Deserializer)
	private readonly commitDeserializer!: Contracts.Crypto.CommitDeserializer;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Commit.ProofSize)
	private readonly proofSize!: () => number;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.Commit> {
		const buffer = ByteBuffer.fromBuffer(buff);

		const proofBuffer = buffer.readBytes(this.proofSize());
		const proof = await this.commitDeserializer.deserializeCommitProof(proofBuffer);

		const block = await this.blockFactory.fromBytes(buffer.getRemainder());

		const commit = {
			block,
			proof,
			serialized: buff.toString("hex"),
		};

		this.#verifySchema(commit);

		return commit;
	}

	public async fromStorage(data: Contracts.Evm.CommitStorageData): Promise<Contracts.Crypto.Commit> {
		const block = await this.blockFactory.fromStorage(data.header, data.transactions);

		const { roundValidators } = this.configuration.getMilestone(block.number);

		const commit = {
			block,
			proof: {
				round: data.proof.round,
				signature: data.proof.signature,
				validators: validatorSetUnpack(data.proof.validatorSet, roundValidators),
			},
		};

		const serialized = await this.commitSerializer.serializeCommit(commit);

		const commitWithSerialized = {
			...commit,
			serialized: serialized.toString("hex"),
		};

		return commitWithSerialized;
	}

	public async fromJson(json: Contracts.Crypto.CommitJson): Promise<Contracts.Crypto.Commit> {
		const block = await this.blockFactory.fromJson(json.block);
		const commit = {
			block,
			proof: json.proof,
			serialized: json.serialized,
		};
		this.#verifySchema(commit);
		return commit;
	}

	#verifySchema<T>(data: T): void {
		const result = this.validator.validate("commit", data);

		if (result.error) {
			throw new MessageSchemaError("commit", result.error);
		}
	}
}
