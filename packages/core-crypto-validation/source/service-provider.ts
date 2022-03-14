import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { registerFormats } from "./formats";
import { registerKeywords } from "./keywords";
import { schemas } from "./schemas";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		await this.#registerFormats();

		await this.#registerKeywords();

		await this.#registerSchemas();
	}

	async #registerFormats(): Promise<void> {
		for (const [name, format] of Object.entries(
			registerFormats(this.app.get(Identifiers.Cryptography.Configuration)),
		)) {
			// @ts-ignore
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addFormat(name, format);
		}
	}

	async #registerKeywords(): Promise<void> {
		for (const [name, format] of Object.entries(
			registerKeywords(this.app.get(Identifiers.Cryptography.Configuration)),
		)) {
			// @ts-ignore
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addFormat(name, format);
		}
	}

	async #registerSchemas(): Promise<void> {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
