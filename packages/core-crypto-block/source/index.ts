import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Deserializer } from "./deserializer";
import { BlockFactory } from "./factory";
import { IDFactory } from "./id.factory";
import { schemas } from "./schemas";
import { Serializer } from "./serializer";
import { Verifier } from "./verifier";

export * from "./schemas";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Factory).to(BlockFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.IDFactory).to(IDFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Verifier).to(Verifier).inSingletonScope();

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
