import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer.js";
import { Factory } from "./factory.js";
import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Message.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Factory).to(Factory).inSingletonScope();

		this.#registerValidation();
	}

	#registerValidation(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
