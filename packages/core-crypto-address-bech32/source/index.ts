import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { AddressFactory } from "./address.factory";
import { makeSchemas } from "./schemas";
import { AddressSerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.Address).toConstantValue(52); // TODO: Check, address length is not constant

		this.app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Identity.AddressSerializer).to(AddressSerializer).inSingletonScope();

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(
			makeSchemas(this.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)),
		)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
