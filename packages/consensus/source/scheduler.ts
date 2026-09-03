import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError, setTimeoutAsync } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class Scheduler implements Contracts.Consensus.Scheduler {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#timeoutStartRound?: NodeJS.Timeout;
	#timeoutPropose?: NodeJS.Timeout;
	#timeoutPrevote?: NodeJS.Timeout;
	#timeoutPrecommit?: NodeJS.Timeout;

	public getNextBlockTimestamp(commitTime: number): number {
		return Math.max(
			commitTime + this.cryptoConfiguration.getMilestone().timeouts.blockPrepareTime,
			this.stateStore.getLastBlock().timestamp + this.cryptoConfiguration.getMilestone().timeouts.blockTime,
		);
	}

	public scheduleTimeoutBlockPrepare(timestamp: number): boolean {
		if (this.#timeoutStartRound) {
			return false;
		}

		const timeout = Math.max(0, timestamp - dayjs().valueOf());

		const consensus = this.#getConsensus();
		const name = `blockPrepare ${consensus.getBlockNumber()}/${consensus.getRound()}`;

		this.#timeoutStartRound = setTimeoutAsync(async () => {
			this.#timeoutStartRound = undefined;
			await this.#runTimeoutHandler(name, () => this.#getConsensus().onTimeoutStartRound());
		}, timeout);

		return true;
	}

	public scheduleTimeoutPropose(height: number, round: number): boolean {
		if (this.#timeoutPropose) {
			return false;
		}

		this.#timeoutPropose = setTimeoutAsync(async () => {
			this.#timeoutPropose = undefined;
			await this.#runTimeoutHandler(`propose ${height}/${round}`, () =>
				this.#getConsensus().onTimeoutPropose(height, round),
			);
		}, this.#getTimeout(round));

		return true;
	}

	public scheduleTimeoutPrevote(height: number, round: number): boolean {
		if (this.#timeoutPrevote) {
			return false;
		}

		this.#timeoutPrevote = setTimeoutAsync(async () => {
			this.#timeoutPrevote = undefined;
			await this.#runTimeoutHandler(`prevote ${height}/${round}`, () =>
				this.#getConsensus().onTimeoutPrevote(height, round),
			);
		}, this.#getTimeout(round));

		return true;
	}

	public scheduleTimeoutPrecommit(height: number, round: number): boolean {
		if (this.#timeoutPrecommit) {
			return false;
		}

		this.#timeoutPrecommit = setTimeoutAsync(async () => {
			this.#timeoutPrecommit = undefined;
			await this.#runTimeoutHandler(`precommit ${height}/${round}`, () =>
				this.#getConsensus().onTimeoutPrecommit(height, round),
			);
		}, this.#getTimeout(round));

		return true;
	}

	public clear(): void {
		if (this.#timeoutStartRound) {
			clearTimeout(this.#timeoutStartRound);
			this.#timeoutStartRound = undefined;
		}

		if (this.#timeoutPropose) {
			clearTimeout(this.#timeoutPropose);
			this.#timeoutPropose = undefined;
		}

		if (this.#timeoutPrevote) {
			clearTimeout(this.#timeoutPrevote);
			this.#timeoutPrevote = undefined;
		}

		if (this.#timeoutPrecommit) {
			clearTimeout(this.#timeoutPrecommit);
			this.#timeoutPrecommit = undefined;
		}
	}

	async #runTimeoutHandler(name: string, callback: () => Promise<void>): Promise<void> {
		try {
			await callback();
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.error(`Timeout handler ${name} failed: ${error.stack ?? error.message}`, "consensus");
		}
	}

	#getTimeout(round: number): number {
		return (
			this.cryptoConfiguration.getMilestone().timeouts.stageTimeout +
			round * this.cryptoConfiguration.getMilestone().timeouts.stageTimeoutIncrease
		);
	}

	#getConsensus(): Contracts.Consensus.Service {
		return this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	}
}
