import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { State } from "./state.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.State).to(State).inSingletonScope();
	}
}
