import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ValidatorSet } from "./validator-set";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("active-validators", Contracts.State.AttributeType.Object);

		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();
	}
}
