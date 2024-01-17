import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { WIFFactory } from "./wif.factory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Identity.Wif.Factory).to(WIFFactory).inSingletonScope();
	}

	public requiredByWorker(): boolean {
		return true;
	}
}
