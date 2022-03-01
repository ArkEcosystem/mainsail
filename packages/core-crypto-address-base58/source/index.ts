import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { AddressFactory } from "./address.factory";
import { AddressSerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		this.app.bind(BINDINGS.Identity.AddressSerializer).to(AddressSerializer).inSingletonScope();
	}
}
