import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Instance } from "./instance";

export * as Bindings from "./generated/bindings";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.Instance).to(Instance).inSingletonScope();
	}

	public async boot(): Promise<void> {}

	public async dispose(): Promise<void> {
		// TODO
	}
}
