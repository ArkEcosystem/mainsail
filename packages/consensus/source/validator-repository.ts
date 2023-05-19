import { injectable } from "@mainsail/container";

import { IValidatorRepository } from "./types";
import { Validator } from "./validator";

@injectable()
export class ValidatorRepository implements IValidatorRepository {
	#validators: Map<string, Validator>;

	configure(validators: Validator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getConsensusPublicKey(), validator]));

		return this;
	}

	getValidator(consensusPublicKey: string): Validator | undefined {
		return this.#validators.get(consensusPublicKey);
	}

	getValidators(consensusPublicKeys: string[]): Validator[] {
		return consensusPublicKeys
			.map((consensusPublicKey) => this.getValidator(consensusPublicKey))
			.filter((validator) => !!validator);
	}
}
