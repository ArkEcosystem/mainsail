import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { MessageSchemaError } from "@mainsail/exceptions";

import { Message } from "./message.js";

@injectable()
export class Factory implements Contracts.Crypto.MessageFactory {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Cryptography.Message.Deserializer)
	private readonly deserializer!: Contracts.Crypto.MessageDeserializer;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	public async makeMessage(
		data: Contracts.Crypto.MakeMessageData,
		keyPair: Contracts.Crypto.KeyPair,
	): Promise<Contracts.Crypto.Message> {
		const worker = await this.workerPool.getWorker();

		const bytes = await this.serializer.serializeMessageForSignature({
			blockHash: data.blockHash,
			blockNumber: data.blockNumber,
			round: data.round,
			type: data.type,
		});
		const signature = await worker.consensusSignature("sign", bytes, Buffer.from(keyPair.privateKey, "hex"));
		const serialized = await this.serializer.serializeMessage({ ...data, signature });
		return this.makeMessageFromBytes(serialized);
	}

	public async makeMessageFromBytes(bytes: Buffer): Promise<Contracts.Crypto.Message> {
		const data = await this.deserializer.deserializeMessage(bytes);
		return this.makeMessageFromData(data, bytes);
	}

	public async makeMessageFromData(
		data: Contracts.Crypto.MessageData,
		serialized?: Buffer,
	): Promise<Contracts.Crypto.Message> {
		this.#applySchema("message", data);

		if (!serialized) {
			serialized = await this.serializer.serializeMessage(data);
		}

		return new Message({ ...data, serialized });
	}

	#applySchema<T>(schema: string, data: T): T {
		const result = this.validator.validate(schema, data);

		if (!result.error) {
			return result.value;
		}

		throw new MessageSchemaError(schema, result.error);
	}
}
