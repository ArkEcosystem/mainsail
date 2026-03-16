import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class Scheduler implements Contracts.Consensus.Scheduler {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

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

		const run = async () => {
			await this.#getConsensus().onTimeoutStartRound();
			this.#timeoutStartRound = undefined;
		};

		this.#timeoutStartRound = setTimeout(() => {
			void run();
		}, timeout);

		return true;
	}

	public scheduleTimeoutPropose(height: number, round: number): boolean {
		if (this.#timeoutPropose) {
			return false;
		}

		const run = async () => {
			await this.#getConsensus().onTimeoutPropose(height, round);
			this.#timeoutPropose = undefined;
		};

		this.#timeoutPropose = setTimeout(() => {
			void run();
		}, this.#getTimeout(round));

		return true;
	}

	public scheduleTimeoutPrevote(height: number, round: number): boolean {
		if (this.#timeoutPrevote) {
			return false;
		}

		const run = async () => {
			await this.#getConsensus().onTimeoutPrevote(height, round);
			this.#timeoutPrevote = undefined;
		};

		this.#timeoutPrevote = setTimeout(() => {
			void run();
		}, this.#getTimeout(round));

		return true;
	}

	public scheduleTimeoutPrecommit(height: number, round: number): boolean {
		if (this.#timeoutPrecommit) {
			return false;
		}

		const run = async () => {
			await this.#getConsensus().onTimeoutPrecommit(height, round);
			this.#timeoutPrecommit = undefined;
		};

		this.#timeoutPrecommit = setTimeout(() => {
			void run();
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
