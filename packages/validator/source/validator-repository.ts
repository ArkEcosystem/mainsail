import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Validator.ValidatorRepository {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	#validators!: Map<string, Contracts.Validator.Validator>;

	public configure(validators: Contracts.Validator.Validator[]): ValidatorRepository {
		this.#validators = new Map(validators.map((validator) => [validator.getConsensusPublicKey(), validator]));

		return this;
	}

	public getValidator(consensusPublicKey: string): Contracts.Validator.Validator | undefined {
		return this.#validators.get(consensusPublicKey);
	}

	public printLoadedValidators(): void {
		if (this.#validators.size === 0) {
			this.logger.info("No validators found on this node");
			return;
		}

		this.logger.info(`A total of ${this.#validators.size} validators(s) were found this node:`);

		const active: string[] = [];
		const standBy: string[] = [];
		const resigned: string[] = [];
		const notRegistered: string[] = [];

		const allValidators = this.validatorSet.getAllValidators();
		const activeValidators = this.validatorSet.getActiveValidators();

		for (const consensusPublicKey of this.#validators.keys()) {
			const validator = allValidators.find((validator) => validator.blsPublicKey === consensusPublicKey);
			if (validator) {
				if (validator.isResigned) {
					resigned.push(validator.address);
				}
				if (activeValidators.some((activeValidator) => activeValidator.blsPublicKey === consensusPublicKey)) {
					active.push(validator.address);
				} else {
					standBy.push(validator.address);
				}
			} else {
				notRegistered.push(consensusPublicKey);
			}
		}

		this.logger.info(`Active validators (${active.length}): [${active}]`);
		this.logger.info(`Stand by validators (${standBy.length}): [${standBy}]`);
		this.logger.info(`Resigned validators (${resigned.length}): [${resigned}]`);
		this.logger.info(`Undefined validators (${notRegistered.length}): [${notRegistered}]`);
	}
}
