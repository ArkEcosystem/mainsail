import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ProposerSelector } from "./proposer-selector";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Proposer.Selector).to(ProposerSelector).inSingletonScope();

		// TODO: Replace string with better structure
		this.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("validatorMatrix", Contracts.State.AttributeType.String);
	}
}
