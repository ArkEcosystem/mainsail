import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { MessageFactory } from "./factory.js";
import { makeKeywords } from "./keywords.js";
import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Message.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Factory).to(MessageFactory).inSingletonScope();

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
