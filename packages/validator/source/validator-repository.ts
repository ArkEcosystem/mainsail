import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Validator.IValidatorRepository {
	#validators!: Map<string, Contracts.Validator.IValidator>;

	configure(validators: Contracts.Validator.IValidator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getConsensusPublicKey(), validator]));

		return this;
	}

	public getValidator(consensusPublicKey: string): Contracts.Validator.IValidator | undefined {
		return this.#validators.get(consensusPublicKey);
	}

	getValidators(consensusPublicKeys: string[]): Contracts.Validator.IValidator[] {
		return consensusPublicKeys
			.map((consensusPublicKey) => this.getValidator(consensusPublicKey))
			.filter((validator): validator is Contracts.Validator.IValidator => !!validator);
	}
}
