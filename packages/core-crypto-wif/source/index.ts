import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { WIFFactory } from "./wif.factory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Identity.WifFactory).to(WIFFactory).inSingletonScope();
	}
}
