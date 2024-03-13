import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ValidatorSet } from "./validator-set.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();
	}
}
