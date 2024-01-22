import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Selector } from "./selector";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Proposer.Selector).to(Selector).inSingletonScope();

		// TODO: Replace string with better structure
		this.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("validatorMatrix", Contracts.State.AttributeType.String);
	}
}
