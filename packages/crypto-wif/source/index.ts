import { injectable, injectFromBase } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { WIFFactory } from "./wif.factory.js";

@injectable()
@injectFromBase()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Identity.Wif.Factory).to(WIFFactory).inSingletonScope();
	}
}
