import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Validator } from "./validator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Validator).to(Validator).inSingletonScope();
	}
}
