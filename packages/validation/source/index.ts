import { injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Validator } from "./validator.js";
export { Validator } from "./validator.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
	}
}
