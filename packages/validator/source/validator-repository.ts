import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Validator.ValidatorRepository {
	#validators!: Map<string, Contracts.Validator.Validator>;

	configure(validators: Contracts.Validator.Validator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getConsensusPublicKey(), validator]));

		return this;
	}

	public getValidator(consensusPublicKey: string): Contracts.Validator.Validator | undefined {
		return this.#validators.get(consensusPublicKey);
	}
}
