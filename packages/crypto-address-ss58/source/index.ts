import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { AddressFactory } from "./address.factory";
import { schemas } from "./schemas";
import { AddressSerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Identity.Address.Size).toConstantValue(32);

		this.app.bind(Identifiers.Cryptography.Identity.Address.Factory).to(AddressFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Identity.Address.Serializer).to(AddressSerializer).inSingletonScope();

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
