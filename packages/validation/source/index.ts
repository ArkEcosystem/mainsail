import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Validator } from "./validator.js";
export { Validator } from "./validator.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
	}
}
