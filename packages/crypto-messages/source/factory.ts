import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { IpcWorker } from "@mainsail/kernel";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";

@injectable()
export class MessageFactory implements Contracts.Crypto.IMessageFactory {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Cryptography.Message.Deserializer)
	private readonly deserializer!: Contracts.Crypto.IMessageDeserializer;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.IValidator;

	@inject(Identifiers.Ipc.WorkerPool)
	private readonly workerPool!: IpcWorker.WorkerPool;

	public async makeProposal(
		data: Contracts.Crypto.IMakeProposalData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IProposal> {
		const worker = await this.workerPool.getWorker();

		const bytes = await this.serializer.serializeProposal(data, { includeSignature: false });
		const signature = await worker.consensusSignature("sign", bytes, Buffer.from(keyPair.privateKey, "hex"));
		const serialized = Buffer.concat([bytes, Buffer.from(signature, "hex")]);
		return this.makeProposalFromBytes(serialized);
	}

	public async makeProposalFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IProposal> {
		const data = await this.deserializer.deserializeProposal(bytes);
		return this.makeProposalFromData(data, bytes);
	}

	public async makeProposalFromData(
		data: Contracts.Crypto.IProposalData,
		serialized?: Buffer,
	): Promise<Contracts.Crypto.IProposal> {
		this.#applySchema("proposal", data);
		const block = await this.blockFactory.fromProposedBytes(Buffer.from(data.block.serialized, "hex"));

		if (!serialized) {
			serialized = await this.serializer.serializeProposal(data, { includeSignature: true });
		}

		return new Proposal({ ...data, block, serialized });
	}

	public async makePrevote(
		data: Contracts.Crypto.IMakePrevoteData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrevote> {
		const worker = await this.workerPool.getWorker();

		const bytes = await this.serializer.serializePrevoteForSignature({
			blockId: data.blockId,
			height: data.height,
			round: data.round,
			type: data.type,
		});
		const signature = await worker.consensusSignature("sign", bytes, Buffer.from(keyPair.privateKey, "hex"));
		const serialized = await this.serializer.serializePrevote({ ...data, signature });
		return this.makePrevoteFromBytes(serialized);
	}

	public async makePrevoteFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const data = await this.deserializer.deserializePrevote(bytes);
		return this.makePrevoteFromData(data, bytes);
	}

	public async makePrevoteFromData(
		data: Contracts.Crypto.IPrevoteData,
		serialized?: Buffer,
	): Promise<Contracts.Crypto.IPrevote> {
		this.#applySchema("prevote", data);

		if (!serialized) {
			serialized = await this.serializer.serializePrevote(data);
		}

		return new Prevote({ ...data, serialized });
	}

	public async makePrecommit(
		data: Contracts.Crypto.IMakePrecommitData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrecommit> {
		const worker = await this.workerPool.getWorker();

		const bytes = await this.serializer.serializePrecommitForSignature({
			blockId: data.blockId,
			height: data.height,
			round: data.round,
			type: data.type,
		});
		const signature = await worker.consensusSignature("sign", bytes, Buffer.from(keyPair.privateKey, "hex"));

		const serialized = await this.serializer.serializePrecommit({ ...data, signature });
		return this.makePrecommitFromBytes(serialized);
	}

	public async makePrecommitFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const data = await this.deserializer.deserializePrecommit(bytes);
		return this.makePrecommitFromData(data, bytes);
	}

	public async makePrecommitFromData(
		data: Contracts.Crypto.IPrecommitData,
		serialized?: Buffer,
	): Promise<Contracts.Crypto.IPrecommit> {
		this.#applySchema("precommit", data);

		if (!serialized) {
			serialized = await this.serializer.serializePrecommit(data);
		}

		return new Precommit({ ...data, serialized });
	}

	#applySchema<T>(schema: string, data: T): T {
		const result = this.validator.validate(schema, data);

		if (!result.error) {
			return result.value;
		}

		throw new Exceptions.MessageSchemaError(schema, result.error);
	}
}
