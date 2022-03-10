import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { BurnFeeMutator } from "./mutator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.State.ValidatorMutator).to(BurnFeeMutator);
	}

	public configSchema(): object {
		return Joi.object({
			percentage: Joi.number().min(0).max(100).required(),
		});
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
