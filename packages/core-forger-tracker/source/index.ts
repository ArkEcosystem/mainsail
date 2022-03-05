import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers } from "@arkecosystem/core-kernel";

import { ValidatorTracker } from "./tracker";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		//
	}

	public async boot(): Promise<void> {
		const validators = this.app.get<Contracts.Forger.Validator[]>(Identifiers.Forger.Validators);

		if (!Array.isArray(validators) || validators.length === 0) {
			return;
		}

		this.app
			.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
			.listen(
				Enums.BlockEvent.Applied,
				this.app.resolve<ValidatorTracker>(ValidatorTracker).initialize(validators),
			);
	}
}
