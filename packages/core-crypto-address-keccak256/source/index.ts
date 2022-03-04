import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { AddressFactory } from "./address.factory";
import { AddressSerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.Address).toConstantValue(20);

		this.app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Identity.AddressSerializer).to(AddressSerializer).inSingletonScope();
	}
}
