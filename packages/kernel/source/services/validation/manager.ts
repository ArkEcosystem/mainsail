import { injectable, injectFromBase } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { JoiValidator } from "./drivers/joi.js";

@injectable()
@injectFromBase()
export class ValidationManager extends InstanceManager<Contracts.Kernel.Validator> {
	protected createJoiDriver(): Contracts.Kernel.Validator {
		return this.app.resolve(JoiValidator);
	}

	protected getDefaultDriver(): string {
		return "joi";
	}
}
