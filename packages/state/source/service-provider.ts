import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { State } from "./state.js";
import { Store } from "./store.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.State.State).to(State).inSingletonScope();
		this.app.bind(Identifiers.State.Store).to(Store).inSingletonScope();
	}
}
