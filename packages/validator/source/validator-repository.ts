import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Validator.ValidatorRepository {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSetService!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#validators!: Map<string, Contracts.Validator.Validator>;

	configure(validators: Contracts.Validator.Validator[]): ValidatorRepository {
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

		const validators = this.stateService.getStore().walletRepository.allValidators();
		const activeValidators = this.validatorSetService.getActiveValidators();

		const active: string[] = [];
		const standBy: string[] = [];
		const resigned: string[] = [];
		const notRegistered: string[] = [];

		for (const consensusPublicKey of this.#validators.keys()) {
			const validator = validators.find(
				(validator) => validator.getAttribute("validatorPublicKey") === consensusPublicKey,
			);

			if (validator) {
				if (validator.hasAttribute("validatorResigned")) {
					resigned.push(validator.toString());
				}
				if (
					activeValidators.some(
						(activeValidator) => activeValidator.getConsensusPublicKey() === consensusPublicKey,
					)
				) {
					active.push(validator.toString());
				} else {
					standBy.push(validator.toString());
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
