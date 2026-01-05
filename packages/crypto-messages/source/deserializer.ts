import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

import { messageSchema } from "./serializer-schemas.js";

@injectable()
export class Deserializer implements Contracts.Crypto.MessageDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	public async deserializeMessage(serialized: Buffer): Promise<Contracts.Crypto.MessageData> {
		const precommit = {} as Contracts.Crypto.MessageData;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.MessageData>(buffer, precommit, {
			schema: messageSchema,
		});

		return precommit;
	}
}
