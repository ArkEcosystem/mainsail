import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ValidatorSet } from "./validator-set";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ValidatorSet).to(ValidatorSet).inSingletonScope();
	}
}
