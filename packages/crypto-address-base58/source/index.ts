import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { AddressFactory } from "./address.factory.js";
import { schemas } from "./schemas.js";
import { AddressSerializer } from "./serializer.js";

export * from "./address.factory.js";
export * from "./schemas.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Legacy.Identity.AddressSize).toConstantValue(21);

		this.app.bind(Identifiers.Cryptography.Legacy.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		this.app
			.bind(Identifiers.Cryptography.Legacy.Identity.AddressSerializer)
			.to(AddressSerializer)
			.inSingletonScope();

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
