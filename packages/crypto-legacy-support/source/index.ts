import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { AddressFactory as Base58AddressFactory } from "@mainsail/crypto-address-base58";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
			.to(Base58AddressFactory)
			.inSingletonScope();
	}
}
