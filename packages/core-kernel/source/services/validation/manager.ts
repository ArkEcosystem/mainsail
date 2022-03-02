import { Kernel } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { JoiValidator } from "./drivers/joi";

export class ValidationManager extends InstanceManager<Kernel.Validator> {
	protected createJoiDriver(): Kernel.Validator {
		return this.app.resolve(JoiValidator);
	}

	protected getDefaultDriver(): string {
		return "joi";
	}
}
