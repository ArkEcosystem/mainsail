import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

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

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			snapshots: Joi.object({
				enabled: Joi.bool().required(),
				interval: Joi.number().integer().min(1).required(),
				retainFiles: Joi.number().integer().min(1).required(),
				skipUnknownAttributes: Joi.bool().required(),
			}).required(),
		})
			.required()
			.unknown(true);
	}
}
