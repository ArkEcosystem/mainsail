import { Identifiers } from "@mainsail/core-contracts";
import { Providers } from "@mainsail/core-kernel";

import { WIFFactory } from "./wif.factory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Identity.WifFactory).to(WIFFactory).inSingletonScope();
	}
}
