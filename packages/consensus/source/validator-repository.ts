import { injectable } from "@mainsail/container";

import { IValidatorRepository } from "./types";
import { Validator } from "./validator";

@injectable()
export class ValidatorRepository implements IValidatorRepository {
	#validators: Map<string, Validator>;

	configure(validators: Validator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getPublicKey(), validator]));

		return this;
	}

	getValidator(publicKey): Validator | undefined {
		return this.#validators.get(publicKey);
	}

	getValidators(publicKeys: string[]): Validator[] {
		return publicKeys.map((publicKey) => this.getValidator(publicKey)).filter((validator) => !!validator);
	}
}
