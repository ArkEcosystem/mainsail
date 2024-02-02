import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { BIP38 } from "./bip38";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.BIP38).to(BIP38).inSingletonScope();
	}
}
