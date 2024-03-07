import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorRepository implements Contracts.Validator.ValidatorRepository {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

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
		this.logger.info(`A total of ${this.#validators.size} validators(s) were found this node:`);

		const validators = this.stateService.getStore().walletRepository.allValidators();

		const active: string[] = [];
		const resigned: string[] = [];
		const notRegistered: string[] = [];

		for (const consensusPublicKey of this.#validators.keys()) {
			const validator = validators.find(
				(validator) => validator.getAttribute("validatorPublicKey") === consensusPublicKey,
			);

			if (validator) {
				if (validator.hasAttribute("validatorResigned")) {
					validator.hasAttribute("username")
						? resigned.push(validator.getAttribute("username"))
						: resigned.push(consensusPublicKey);
				} else {
					validator.hasAttribute("username")
						? active.push(validator.getAttribute("username"))
						: active.push(validator.getAddress());
				}
			} else {
				notRegistered.push(consensusPublicKey);
			}
		}

		this.logger.info(`Active validators (${active.length}): [${active}]`);
		this.logger.info(`Resigned validators (${resigned.length}): [${resigned}]`);
		this.logger.info(`Unregistered validators (${notRegistered.length}): [${notRegistered}]`);
	}
}
