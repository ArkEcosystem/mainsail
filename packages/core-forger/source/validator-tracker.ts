import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Services, Utils } from "@arkecosystem/core-kernel";

import { Validator } from "./interfaces";

@injectable()
export class ValidatorTracker {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchainService: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: any;

	@inject(Identifiers.Cryptography.Time.BlockTimeCalculator)
	private readonly blockTimeCalculator: any;

	private validators: Validator[] = [];

	public initialize(validators: Validator[]): this {
		this.validators = validators;

		return this;
	}

	public async handle(): Promise<void> {
		// Arrange...
		const { height, timestamp } = this.blockchainService.getLastBlock().data;
		const maxValidators = this.configuration.getMilestone(height).activeValidators;
		const blockTime: number = this.blockTimeCalculator.calculateBlockTime(height);
		const round: Contracts.Shared.RoundInfo = Utils.roundCalculator.calculateRound(height, this.configuration);

		const activeValidators: any = await this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.call("getActiveValidators", { roundInfo: round });

		const activeValidatorsPublicKeys: (string | undefined)[] = activeValidators.map(
			(validator: Contracts.State.Wallet) => validator.getPublicKey(),
		);

		const blockTimeLookup = await Utils.forgingInfoCalculator.getBlockTimeLookup(
			this.app,
			height,
			this.configuration,
		);

		const forgingInfo: Contracts.Shared.ForgingInfo = Utils.forgingInfoCalculator.calculateForgingInfo(
			timestamp,
			height,
			blockTimeLookup,
			this.configuration,
			this.slots,
		);

		// Determine Next Forgers...
		const nextForgers: string[] = [];
		for (let index = 0; index <= maxValidators; index++) {
			const validator: string | undefined =
				activeValidatorsPublicKeys[(forgingInfo.currentForger + index) % maxValidators];

			if (validator) {
				nextForgers.push(validator);
			}
		}

		if (activeValidatorsPublicKeys.length < maxValidators) {
			return this.logger.warning(
				`Tracker only has ${Utils.pluralize(
					"active validator",
					activeValidatorsPublicKeys.length,
					true,
				)} from a required ${maxValidators}`,
			);
		}

		// Determine Next Forger Usernames...
		const nextForgersUsernames = [];

		for (let index = 0; index < nextForgers.slice(0, 5).length; index++) {
			nextForgersUsernames[index] = await this.getUsername(nextForgers[index]);
		}

		this.logger.debug(`Next Forgers: ${JSON.stringify(nextForgersUsernames)}`);

		const secondsToNextRound: number = (maxValidators - forgingInfo.currentForger - 1) * blockTime;

		for (const validator of this.validators) {
			let indexInNextForgers = 0;
			for (const [index, nextForger] of nextForgers.entries()) {
				if (nextForger === validator.publicKey) {
					indexInNextForgers = index;
					break;
				}
			}

			if (indexInNextForgers === 0) {
				this.logger.debug(`${this.getUsername(validator.publicKey)} will forge next.`);
			} else if (indexInNextForgers <= maxValidators - forgingInfo.nextForger) {
				this.logger.debug(
					`${this.getUsername(validator.publicKey)} will forge in ${Utils.prettyTime(
						indexInNextForgers * blockTime * 1000,
					)}.`,
				);
			} else {
				this.logger.debug(`${this.getUsername(validator.publicKey)} has already forged.`);
			}
		}

		this.logger.debug(`Round ${round.round} will end in ${Utils.prettyTime(secondsToNextRound * 1000)}.`);
	}

	private async getUsername(publicKey: string): Promise<string> {
		return (await this.walletRepository.findByPublicKey(publicKey)).getAttribute("validator.username");
	}
}
