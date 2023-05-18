import { Validator } from "./validator";

export class ValidatorRepository {
	#validators: Map<string, Validator>;

	async configure(validators) {
		this.#validators = new Map(validators.map((validator) => [validator.getPublicKey(), validator]));
	}

	getValidator(publicKey): Validator | undefined {
		return this.#validators.get(publicKey);
	}

	getValidators(publicKeys: string[]) {
		return publicKeys.map((publicKey) => this.getValidator(publicKey)).filter((validator) => !!validator);
	}
}
