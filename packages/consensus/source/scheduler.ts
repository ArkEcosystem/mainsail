import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class Scheduler implements Contracts.Consensus.Scheduler {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	#timeoutStartRound?: NodeJS.Timeout;
	#timeoutPropose?: NodeJS.Timeout;
	#timeoutPrevote?: NodeJS.Timeout;
	#timeoutPrecommit?: NodeJS.Timeout;

	public scheduleTimeoutStartRound(): void {
		if (this.#timeoutStartRound) {
			return;
		}

		const timeout = Math.max(
			0,
			this.stateService.getStateStore().getLastBlock().data.timestamp -
				dayjs().valueOf() +
				this.cryptoConfiguration.getMilestone().blockTime,
		);

		this.#timeoutStartRound = setTimeout(async () => {
			await this.#getConsensus().onTimeoutStartRound();
			this.#timeoutStartRound = undefined;
		}, timeout);
	}

	public scheduleTimeoutPropose(height: number, round: number): void {
		if (this.#timeoutPropose) {
			return;
		}

		this.#timeoutPropose = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPropose(height, round);
			this.#timeoutPropose = undefined;
		}, this.#getTimeout(round));
	}

	public scheduleTimeoutPrevote(height: number, round: number): void {
		if (this.#timeoutPrevote) {
			return;
		}

		this.#timeoutPrevote = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPrevote(height, round);
			this.#timeoutPrevote = undefined;
		}, this.#getTimeout(round));
	}

	public scheduleTimeoutPrecommit(height: number, round: number): void {
		if (this.#timeoutPrecommit) {
			return;
		}

		this.#timeoutPrecommit = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPrecommit(height, round);
			this.#timeoutPrecommit = undefined;
		}, this.#getTimeout(round));
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
			this.cryptoConfiguration.getMilestone().stageTimeout +
			round * this.cryptoConfiguration.getMilestone().stageTimeoutIncrease
		);
	}

	#getConsensus(): Contracts.Consensus.ConsensusService {
		return this.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);
	}
}
