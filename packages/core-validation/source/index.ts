import { Identifiers } from "@mainsail/core-contracts";
import { Providers } from "@mainsail/core-kernel";

import { Validator } from "./validator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
	}
}
