import { Identifiers } from "@mainsail/contracts";
import { AddressFactory as Base58AddressFactory } from "@mainsail/crypto-address-base58";
import { Providers } from "@mainsail/kernel";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
			.to(Base58AddressFactory)
			.inSingletonScope();
	}
}
