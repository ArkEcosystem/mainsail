import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Enums, Services, Utils as AppUtils } from "@mainsail/kernel";

import { Utils } from "./utils";

// @TODO review the implementation - quite a mess right now with quite a few responsibilities
@injectable()
export class ForgerService {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly peerNetworkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	#validators: Contracts.Forger.Validator[] = [];

	#usernames: { [key: string]: string } = {};

	#isStopped = false;

	#round: Contracts.P2P.CurrentRound | undefined;

	#initialized = false;

	#logAppReady = true;

	public getRound(): Contracts.P2P.CurrentRound | undefined {
		return this.#round;
	}

	public async boot(validators: Contracts.Forger.Validator[]): Promise<void> {
		this.#validators = validators;

		let timeout = 2000;
		try {
			await this.#loadRound();

			AppUtils.assert.defined<Contracts.P2P.CurrentRound>(this.#round);

			timeout = Math.max(0, Utils.getRemainingSlotTime(this.#round, this.configuration) ?? 0);
		} catch {
			this.logger.warning("Waiting for a responsive host");
		} finally {
			this.#checkLater(timeout);
		}
	}

	public async dispose(): Promise<void> {
		this.#isStopped = true;
	}

	public async checkSlot(): Promise<void> {
		try {
			if (this.#isStopped) {
				return;
			}

			await this.#loadRound();

			AppUtils.assert.defined<Contracts.P2P.CurrentRound>(this.#round);

			if (!this.#round.canForge) {
				// basically looping until we lock at beginning of next slot
				return this.#checkLater(200);
			}

			AppUtils.assert.defined<string>(this.#round.currentForger.publicKey);

			const validator: Contracts.Forger.Validator | undefined = this.#isActiveValidator(
				this.#round.currentForger.publicKey,
			);

			if (!validator) {
				AppUtils.assert.defined<string>(this.#round.nextForger.publicKey);

				if (this.#isActiveValidator(this.#round.nextForger.publicKey)) {
					const username = this.#usernames[this.#round.nextForger.publicKey];

					this.logger.info(
						`Next forging validator ${username} (${
							this.#round.nextForger.publicKey
						}) is active on this node.`,
					);

					this.blockchain.forceWakeup();
				}

				return this.#checkLater(Utils.getRemainingSlotTime(this.#round, this.configuration) ?? 1000);
			}

			const networkState: Contracts.P2P.NetworkState = await this.peerNetworkMonitor.getNetworkState();

			if (networkState.getNodeHeight() !== this.#round.lastBlock.height) {
				this.logger.warning(
					`The NetworkState height (${networkState
						.getNodeHeight()
						?.toLocaleString()}) and round height (${this.#round.lastBlock.height.toLocaleString()}) are out of sync. This indicates delayed blocks on the network.`,
				);
			}

			if (
				await this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("isForgingAllowed", { forgerService: this, networkState, validator })
			) {
				await this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("forgeNewBlock", { forgerService: this, networkState, round: this.#round, validator });
			}

			this.#logAppReady = true;

			return this.#checkLater(Utils.getRemainingSlotTime(this.#round, this.configuration) ?? 1000);
		} catch (error) {
			if (
				error instanceof Exceptions.HostNoResponseError ||
				error instanceof Exceptions.RelayCommunicationError
			) {
				if (error.message.includes("blockchain isn't ready") || error.message.includes("App is not ready")) {
					if (this.#logAppReady) {
						this.logger.info("Waiting for relay to become ready.");
						this.#logAppReady = false;
					}
				} else {
					this.logger.warning(error.message);
				}
			} else {
				this.logger.error(error.stack);

				if (this.#round) {
					this.logger.info(
						`Round: ${this.#round.current.toLocaleString()}, height: ${this.#round.lastBlock.height.toLocaleString()}`,
					);
				}

				await this.events.dispatch(Enums.ForgerEvent.Failed, { error: error.message });
			}

			// no idea when this will be ok, so waiting 2s before checking again
			return this.#checkLater(2000);
		}
	}

	#isActiveValidator(publicKey: string): Contracts.Forger.Validator | undefined {
		return this.#validators.find((validator) => validator.publicKey === publicKey);
	}

	async #loadRound(): Promise<void> {
		this.#round = await this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.call("getCurrentRound");

		AppUtils.assert.defined<Contracts.P2P.CurrentRound>(this.#round);

		this.#usernames = this.#round.validators.reduce((accumulator, wallet) => {
			AppUtils.assert.defined<string>(wallet.publicKey);

			return Object.assign(accumulator, {
				[wallet.publicKey]: wallet.validator.username,
			});
		}, {});

		this.app.rebind(Identifiers.Forger.Usernames).toConstantValue(this.#usernames);

		if (!this.#initialized) {
			this.#printLoadedValidators();

			await this.events.dispatch(Enums.ForgerEvent.Started, {
				activeValidators: this.#validators.map((validator) => validator.publicKey),
			});

			this.logger.info(`Forger Manager started.`);
		}

		this.#initialized = true;
	}

	#checkLater(timeout: number): void {
		setTimeout(() => this.checkSlot(), timeout);
	}

	#printLoadedValidators(): void {
		const activeValidators: Contracts.Forger.Validator[] = this.#validators.filter((validator) => {
			AppUtils.assert.defined<string>(validator.publicKey);

			return this.#usernames.hasOwnProperty(validator.publicKey);
		});

		if (activeValidators.length > 0) {
			for (const { publicKey } of activeValidators) {
				this.logger.info(`Loaded validator ${this.#usernames[publicKey]} (${publicKey})`);
			}

			this.logger.info(`Loaded ${AppUtils.pluralize("validator", activeValidators.length, true)}.`);
		}

		if (this.#validators.length > activeValidators.length) {
			const inactiveValidators: (string | undefined)[] = this.#validators
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
