import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { MessageSchemaError } from "@mainsail/exceptions";
import { ByteBuffer } from "@mainsail/utils";

import { Proposal } from "./proposal.js";

@injectable()
export class Factory implements Contracts.Crypto.ProposalFactory {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly serializer!: Contracts.Crypto.ProposalSerializer;

	@inject(Identifiers.Cryptography.Proposal.Deserializer)
	private readonly deserializer!: Contracts.Crypto.ProposalDeserializer;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	public async makeProposal(
		data: Contracts.Crypto.ProposalDataSerializableUnsigned,
		keyPair: Contracts.Crypto.KeyPair,
	): Promise<Contracts.Crypto.Proposal> {
		const worker = await this.workerPool.getWorker();

		this.#verifySchema("proposalUnsigned", data);

		const bytes = await this.serializer.serializeProposalUnsigned(data);
		const signature = await worker.consensusSignature("sign", bytes, Buffer.from(keyPair.privateKey, "hex"));
		const serialized = Buffer.concat([bytes, Buffer.from(signature, "hex")]);
		return this.makeProposalFromBytes(serialized);
	}

	public async makeProposalFromBytes(serialized: Buffer): Promise<Contracts.Crypto.Proposal> {
		const proposalData = await this.deserializer.deserializeProposal(serialized);

		this.#verifySchema("proposal", proposalData);

		const { blockHeader, lockProof } = await this.#getLockProofAndBlockHeader(
			Buffer.from(proposalData.payloadSerialized, "hex"),
		);

		return this.app.resolve<Proposal>(Proposal).initialize({
			...proposalData,
			blockHeader,
			lockProof,
			serialized,
		});
	}

	async makePayloadFromBytes(bytes: Buffer): Promise<Contracts.Crypto.ProposedPayload> {
		const buffer = ByteBuffer.fromBuffer(bytes);

		const lockProof = await this.#getLockProof(buffer);
		const block = await this.blockFactory.fromBytes(buffer.getRemainder());

		if(lockProof) {
			this.#verifySchema("lockProof", { ...lockProof, number: block.number });
		}

		return {
			block,
			lockProof,
			serialized: bytes.toString("hex"),
		};
	}

	async #getLockProof(buffer: ByteBuffer): Promise<Contracts.Crypto.AggregatedSignature | undefined> {
		const lockProofLength = buffer.readUint8();

		let lockProof: Contracts.Crypto.AggregatedSignature | undefined;
		if (lockProofLength > 0) {
			const lockProofBuffer = buffer.readBytes(lockProofLength);
			lockProof = await this.deserializer.deserializeLockProof(lockProofBuffer);
		}

		return lockProof;
	}

	async #getLockProofAndBlockHeader(
		bytes: Buffer,
	): Promise<{ blockHeader: Contracts.Crypto.BlockHeader; lockProof?: Contracts.Crypto.AggregatedSignature }> {
		const buffer = ByteBuffer.fromBuffer(bytes);

		const lockProof = await this.#getLockProof(buffer);
		const blockHeader = await this.blockFactory.headerFromBytes(buffer.getRemainder());

		if (lockProof) {
			this.#verifySchema("lockProof", { ...lockProof, number: blockHeader.number });
		}

		return {
			blockHeader,
			lockProof,
		};
	}

	#verifySchema<T>(schema: string, data: T): void {
		const result = this.validator.validate(schema, data);

		if (result.error) {
			throw new MessageSchemaError(schema, result.error);
		}
	}
}
