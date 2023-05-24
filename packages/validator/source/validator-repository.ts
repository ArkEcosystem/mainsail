import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Consensus.IValidatorRepository {
	#validators: Map<string, Contracts.Consensus.IValidator>;

	configure(validators: Contracts.Consensus.IValidator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getConsensusPublicKey(), validator]));

		return this;
	}

	getValidator(consensusPublicKey: string): Contracts.Consensus.IValidator | undefined {
		return this.#validators.get(consensusPublicKey);
	}

	getValidators(consensusPublicKeys: string[]): Contracts.Consensus.IValidator[] {
		return consensusPublicKeys
			.map((consensusPublicKey) => this.getValidator(consensusPublicKey))
			.filter((validator) => !!validator);
	}
}
