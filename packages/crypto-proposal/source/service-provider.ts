import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { Factory } from "./factory.js";
import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Proposal.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Proposal.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Proposal.Factory).to(Factory).inSingletonScope();

		this.app.bind(Identifiers.Cryptography.Proposal.LockProofSize).toConstantValue(() => {
			const signatureSize = this.app.getTagged<number>(
				Identifiers.Cryptography.Signature.Size,
				"type",
				"consensus",
			);

			return (
				signatureSize + // signature
				1 +
				8 // validator set bitmap
			);
		});

		this.#registerValidation();
	}

	#registerValidation(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
