import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { BlockFactory } from "./factory.js";
import { IDFactory } from "./id.factory.js";
import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";
import { Verifier } from "./verifier.js";

export * from "./deserializer.js";
export * from "./factory.js";
export * from "./id.factory.js";
export * from "./schemas.js";
export * from "./serializer.js";
export * from "./verifier.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Block.HeaderSize).toFunction(() => {
			const hashByteLength = this.app.get<number>(Identifiers.Cryptography.Hash.Size.SHA256);
			const generatorAddressByteLength = this.app.get<number>(Identifiers.Cryptography.Identity.Address.Size);

			return (
				1 + // version
				6 + // timestamp
				4 + // height
				4 + // round
				hashByteLength + // previousBlock
				hashByteLength + // stateHash
				2 + // numberOfTransactions
				4 + // totalGasUsed
				32 + // totalAmount
				32 + // totalFee
				32 + // reward
				4 + // payloadLength
				hashByteLength + // payloadHash
				generatorAddressByteLength
			);
		});

		this.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Factory).to(BlockFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.IDFactory).to(IDFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Verifier).to(Verifier).inSingletonScope();

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
