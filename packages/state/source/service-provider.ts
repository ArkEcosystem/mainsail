import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Service } from "./service.js";
import { State } from "./state.js";
import { Store } from "./store.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.State.Store.Factory).toFactory(
			({ container }) =>
				() =>
					container.resolve(Store),
		);

		this.app.bind(Identifiers.State.Service).to(Service).inSingletonScope();
		this.app.bind(Identifiers.State.State).to(State).inSingletonScope();
	}
}
