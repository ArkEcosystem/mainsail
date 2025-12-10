import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { Factory } from "./factory.js";
import { makeKeywords } from "./keywords.js";
import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";

export { Proposal } from "./proposal.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Proposal.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Proposal.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Proposal.Factory).to(Factory).inSingletonScope();

		this.#registerValidation();
	}

	#registerValidation(): void {
		for (const keyword of Object.values(makeKeywords(this.app.get(Identifiers.Cryptography.Configuration)))) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
