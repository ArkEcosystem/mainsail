import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { secrets } from "../../core/bin/config/testnet/validators.json";
import { Validator } from "./validator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const keyPairFactory = this.app.get<Contracts.Crypto.IKeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPairFactory,
		);

		const keyPairs = await Promise.all(secrets.map(async (menonic) => await keyPairFactory.fromMnemonic(menonic)));
		const validators = keyPairs.map((keyPair) => new Validator(keyPair));
	}
}
