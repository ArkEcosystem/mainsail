import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { State } from "./state.js";
import { Store } from "./store.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.State.State).to(State).inSingletonScope();
		this.app.bind(Identifiers.State.Store).to(Store).inSingletonScope();
	}
}
