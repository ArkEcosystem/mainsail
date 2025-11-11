import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { State } from "./state.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.State).to(State).inSingletonScope();
	}
}
