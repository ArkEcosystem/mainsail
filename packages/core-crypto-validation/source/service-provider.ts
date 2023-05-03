import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/core-kernel";

import { makeKeywords } from "./keywords";
import { schemas } from "./schemas";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		await this.#registerKeywords();

		await this.#registerSchemas();
	}

	async #registerKeywords(): Promise<void> {
		for (const keyword of Object.values(makeKeywords(this.app.get(Identifiers.Cryptography.Configuration)))) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}
	}

	async #registerSchemas(): Promise<void> {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
