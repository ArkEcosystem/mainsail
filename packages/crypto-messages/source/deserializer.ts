import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { MessageDeserializationError } from "@mainsail/exceptions";
import { ByteBuffer } from "@mainsail/utils";

import { schema } from "./serializer-schemas.js";

@injectable()
export class Deserializer implements Contracts.Crypto.MessageDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	public async deserializeMessage(serialized: Buffer): Promise<Contracts.Crypto.MessageData> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		try {
			const result =  await this.serializer.deserialize<Contracts.Crypto.MessageData>(
				buffer,
				{},
				{
					schema,
				},
			);

			if(buffer.getRemainderLength() === 0) {
				return result;
			}
		} catch (error) {
			throw new MessageDeserializationError(error instanceof Error ? error.message : "");
		}

		throw new MessageDeserializationError(`${buffer.getRemainderLength()} bytes remaining`);
	}
}
