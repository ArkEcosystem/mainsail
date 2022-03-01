import { BINDINGS, IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Services, Utils } from "@arkecosystem/core-kernel";

import { Delegate } from "./interfaces";

@Container.injectable()
export class DelegateTracker {
	@Container.inject(Container.Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@Container.inject(Container.Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@Container.inject(Container.Identifiers.BlockchainService)
	private readonly blockchainService: Contracts.Blockchain.Blockchain;

	@Container.inject(Container.Identifiers.WalletRepository)
	@Container.tagged("state", "blockchain")
	private readonly walletRepository: Contracts.State.WalletRepository;

	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Time.Slots)
	private readonly slots: any;

	@Container.inject(BINDINGS.Time.BlockTimeCalculator)
	private readonly blockTimeCalculator: any;

	private delegates: Delegate[] = [];

	public initialize(delegates: Delegate[]): this {
		this.delegates = delegates;

		return this;
	}

	public async handle(): Promise<void> {
		// Arrange...
		const { height, timestamp } = this.blockchainService.getLastBlock().data;
		const maxDelegates = this.configuration.getMilestone(height).activeDelegates;
		const blockTime: number = this.blockTimeCalculator.calculateBlockTime(height);
		const round: Contracts.Shared.RoundInfo = Utils.roundCalculator.calculateRound(height, this.configuration);

		const activeDelegates: any = await this.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.call("getActiveDelegates", { roundInfo: round });

		const activeDelegatesPublicKeys: (string | undefined)[] = activeDelegates.map(
			(delegate: Contracts.State.Wallet) => delegate.getPublicKey(),
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
		for (let index = 0; index <= maxDelegates; index++) {
			const delegate: string | undefined =
				activeDelegatesPublicKeys[(forgingInfo.currentForger + index) % maxDelegates];

			if (delegate) {
				nextForgers.push(delegate);
			}
		}

		if (activeDelegatesPublicKeys.length < maxDelegates) {
			return this.logger.warning(
				`Tracker only has ${Utils.pluralize(
					"active delegate",
					activeDelegatesPublicKeys.length,
					true,
				)} from a required ${maxDelegates}`,
			);
		}

		// Determine Next Forger Usernames...
		const nextForgersUsernames = [];

		for (let index = 0; index < nextForgers.slice(0, 5).length; index++) {
			nextForgersUsernames[index] = await this.getUsername(nextForgers[index]);
		}

		this.logger.debug(`Next Forgers: ${JSON.stringify(nextForgersUsernames)}`);

		const secondsToNextRound: number = (maxDelegates - forgingInfo.currentForger - 1) * blockTime;

		for (const delegate of this.delegates) {
			let indexInNextForgers = 0;
			for (const [index, nextForger] of nextForgers.entries()) {
				if (nextForger === delegate.publicKey) {
					indexInNextForgers = index;
					break;
				}
			}

			if (indexInNextForgers === 0) {
				this.logger.debug(`${this.getUsername(delegate.publicKey)} will forge next.`);
			} else if (indexInNextForgers <= maxDelegates - forgingInfo.nextForger) {
				this.logger.debug(
					`${this.getUsername(delegate.publicKey)} will forge in ${Utils.prettyTime(
						indexInNextForgers * blockTime * 1000,
					)}.`,
				);
			} else {
				this.logger.debug(`${this.getUsername(delegate.publicKey)} has already forged.`);
			}
		}

		this.logger.debug(`Round ${round.round} will end in ${Utils.prettyTime(secondsToNextRound * 1000)}.`);
	}

	private async getUsername(publicKey: string): Promise<string> {
		return (await this.walletRepository.findByPublicKey(publicKey)).getAttribute("delegate.username");
	}
}
