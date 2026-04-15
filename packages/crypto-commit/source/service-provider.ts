import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { CommitFactory } from "./factory.js";
import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Commit.ProofSize).toConstantValue(
			() =>
				4 + // round
				this.app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "consensus") + // signature
				1 +
				8, // validator set bitmap);
		);

		this.app.bind(Identifiers.Cryptography.Commit.Serializer).to(Serializer).inSingletonScope();

		this.app.bind(Identifiers.Cryptography.Commit.Deserializer).to(Deserializer).inSingletonScope();

		this.app.bind(Identifiers.Cryptography.Commit.Factory).to(CommitFactory).inSingletonScope();

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
