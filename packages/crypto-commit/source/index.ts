import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { CommitFactory } from "./factory.js";
import { Serializer } from "./serializer.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Commit.ProofSize).toFunction(
			() =>
				4 + // round
				this.app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "consensus") + // signature
				1 +
				8, // validator set bitmap);
		);

		this.app.bind(Identifiers.Cryptography.Commit.Serializer).to(Serializer).inSingletonScope();

		this.app.bind(Identifiers.Cryptography.Commit.Deserializer).to(Deserializer).inSingletonScope();

		this.app.bind(Identifiers.Cryptography.Commit.Factory).to(CommitFactory).inSingletonScope();
	}
}
