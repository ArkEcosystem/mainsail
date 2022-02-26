import { Providers } from "@arkecosystem/core-kernel";
import { BINDINGS } from "@packages/core-crypto-contracts/distribution";

import { Validator } from "./validator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Validator).to(Validator).inSingletonScope();
	}
}
