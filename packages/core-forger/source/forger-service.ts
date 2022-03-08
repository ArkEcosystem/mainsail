import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Services, Utils as AppUtils } from "@arkecosystem/core-kernel";

// todo: review the implementation - quite a mess right now with quite a few responsibilities
@injectable()
export class ForgerService {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionHandlerProvider)
	private readonly handlerProvider: Contracts.Transactions.ITransactionHandlerProvider;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly peerNetworkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	private validators: Contracts.Forger.Validator[] = [];

	private usernames: { [key: string]: string } = {};

	private isStopped = false;

	private round: Contracts.P2P.CurrentRound | undefined;

	private initialized = false;

	private logAppReady = true;

	public getRound(): Contracts.P2P.CurrentRound | undefined {
		return this.round;
	}

	public getRemainingSlotTime(): number | undefined {
		if (this.round) {
			const { blocktime } = this.configuration.getMilestone(this.round.lastBlock.height);

			return this.round.timestamp + blocktime * 1000 - Date.now();
		}

		return undefined;
	}

	public async boot(validators: Contracts.Forger.Validator[]): Promise<void> {
		if (this.handlerProvider.isRegistrationRequired()) {
			this.handlerProvider.registerHandlers();
		}

		this.validators = validators;

		const timeout = 2000;
		try {
			await this.#loadRound();
			AppUtils.assert.defined<Contracts.P2P.CurrentRound>(this.round);
			// @TODO
			// timeout = Math.max(0, this.getRemainingSlotTime());
		} catch {
			this.logger.warning("Waiting for a responsive host");
		} finally {
			this.#checkLater(timeout);
		}
	}

	public async dispose(): Promise<void> {
		this.isStopped = true;
	}

	public async checkSlot(): Promise<void> {
		try {
			if (this.isStopped) {
				return;
			}

			await this.#loadRound();

			AppUtils.assert.defined<Contracts.P2P.CurrentRound>(this.round);

			if (!this.round.canForge) {
				// basically looping until we lock at beginning of next slot
				return this.#checkLater(200);
			}

			AppUtils.assert.defined<string>(this.round.currentForger.publicKey);

			const validator: Contracts.Forger.Validator | undefined = this.#isActiveValidator(
				this.round.currentForger.publicKey,
			);

			if (!validator) {
				AppUtils.assert.defined<string>(this.round.nextForger.publicKey);

				if (this.#isActiveValidator(this.round.nextForger.publicKey)) {
					const username = this.usernames[this.round.nextForger.publicKey];

					this.logger.info(
						`Next forging validator ${username} (${this.round.nextForger.publicKey}) is active on this node.`,
					);

					await this.blockchain.forceWakeup();
				}

				return this.#checkLater(this.getRemainingSlotTime());
			}

			const networkState: Contracts.P2P.NetworkState = await this.peerNetworkMonitor.getNetworkState();

			if (networkState.getNodeHeight() !== this.round.lastBlock.height) {
				this.logger.warning(
					`The NetworkState height (${networkState
						.getNodeHeight()
						?.toLocaleString()}) and round height (${this.round.lastBlock.height.toLocaleString()}) are out of sync. This indicates delayed blocks on the network.`,
				);
			}

			if (
				await this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("isForgingAllowed", { forgerService: this, networkState, validator })
			) {
				await this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("forgeNewBlock", { forgerService: this, networkState, round: this.round, validator });
			}

			this.logAppReady = true;

			return this.#checkLater(this.getRemainingSlotTime());
		} catch (error) {
			console.log(error);

			if (
				error instanceof Exceptions.HostNoResponseError ||
				error instanceof Exceptions.RelayCommunicationError
			) {
				if (error.message.includes("blockchain isn't ready") || error.message.includes("App is not ready")) {
					if (this.logAppReady) {
						this.logger.info("Waiting for relay to become ready.");
						this.logAppReady = false;
					}
				} else {
					this.logger.warning(error.message);
				}
			} else {
				this.logger.error(error.stack);

				if (this.round) {
					this.logger.info(
						`Round: ${this.round.current.toLocaleString()}, height: ${this.round.lastBlock.height.toLocaleString()}`,
					);
				}

				await this.events.dispatch(Enums.ForgerEvent.Failed, { error: error.message });
			}

			// no idea when this will be ok, so waiting 2s before checking again
			return this.#checkLater(2000);
		}
	}

	#isActiveValidator(publicKey: string): Contracts.Forger.Validator | undefined {
		return this.validators.find((validator) => validator.publicKey === publicKey);
	}

	async #loadRound(): Promise<void> {
		this.round = await this.app.get<Services.Triggers.Triggers>(Identifiers.TriggerService).call("getCurrentRound");

		this.usernames = this.round.validators.reduce((accumulator, wallet) => {
			AppUtils.assert.defined<string>(wallet.publicKey);

			return Object.assign(accumulator, {
				[wallet.publicKey]: wallet.validator.username,
			});
		}, {});

		this.app.rebind(Identifiers.Forger.Usernames).toConstantValue(this.usernames);

		if (!this.initialized) {
			this.#printLoadedValidators();

			await this.events.dispatch(Enums.ForgerEvent.Started, {
				activeValidators: this.validators.map((validator) => validator.publicKey),
			});

			this.logger.info(`Forger Manager started.`);
		}

		this.initialized = true;
	}

	#checkLater(timeout: number): void {
		setTimeout(() => this.checkSlot(), timeout);
	}

	#printLoadedValidators(): void {
		const activeValidators: Contracts.Forger.Validator[] = this.validators.filter((validator) => {
			AppUtils.assert.defined<string>(validator.publicKey);

			return this.usernames.hasOwnProperty(validator.publicKey);
		});

		if (activeValidators.length > 0) {
			this.logger.info(
				`Loaded ${AppUtils.pluralize("active validator", activeValidators.length, true)}: ${activeValidators
					.map(({ publicKey }) => {
						AppUtils.assert.defined<string>(publicKey);

						return `${this.usernames[publicKey]} (${publicKey})`;
					})
					.join(", ")}`,
			);
		}

		if (this.validators.length > activeValidators.length) {
			const inactiveValidators: (string | undefined)[] = this.validators
				.filter((validator) => !activeValidators.includes(validator))
				.map((validator) => validator.publicKey);

			this.logger.info(
				`Loaded ${AppUtils.pluralize(
					"inactive validator",
					inactiveValidators.length,
					true,
				)}: ${inactiveValidators.join(", ")}`,
			);
		}
	}
}
