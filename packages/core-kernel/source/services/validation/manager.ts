import { Validator } from "../../contracts/kernel/validation";
import { InstanceManager } from "../../support/instance-manager";
import { JoiValidator } from "./drivers/joi";

export class ValidationManager extends InstanceManager<Validator> {
	protected createJoiDriver(): Validator {
		return this.app.resolve(JoiValidator);
	}

	protected getDefaultDriver(): string {
		return "joi";
	}
}
