import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Validator.ValidatorRepository {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	#validators!: Map<string, Contracts.Validator.Validator>;

	configure(validators: Contracts.Validator.Validator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getConsensusPublicKey(), validator]));

		return this;
	}

	public getValidator(consensusPublicKey: string): Contracts.Validator.Validator | undefined {
		return this.#validators.get(consensusPublicKey);
	}
}
