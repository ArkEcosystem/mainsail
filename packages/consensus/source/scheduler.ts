import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";
import delay from "delay";

@injectable()
export class Scheduler implements Contracts.Consensus.IScheduler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	#timeoutPropose?: NodeJS.Timeout;
	#timeoutPrevote?: NodeJS.Timeout;
	#timeoutPrecommit?: NodeJS.Timeout;

	public async delayProposal(): Promise<void> {
		await delay(
			Math.max(
				0,
				this.state.getLastBlock().data.timestamp -
					dayjs().unix() +
					this.cryptoConfiguration.getMilestone().blockTime,
			),
		);
	}

	public async scheduleTimeoutPropose(height: number, round: number): Promise<void> {
		if (this.#timeoutPropose) {
			return;
		}

		this.#timeoutPropose = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPropose(height, round);
			this.#timeoutPropose = undefined;
		}, this.#getTimeout(round));
	}

	public async scheduleTimeoutPrevote(height: number, round: number): Promise<void> {
		if (this.#timeoutPrevote) {
			return;
		}

		this.#timeoutPrevote = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPrevote(height, round);
			this.#timeoutPrevote = undefined;
		}, this.#getTimeout(round));
	}

	public async scheduleTimeoutPrecommit(height: number, round: number): Promise<void> {
		if (this.#timeoutPrecommit) {
			return;
		}

		this.#timeoutPrecommit = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPrecommit(height, round);
			this.#timeoutPrecommit = undefined;
		}, this.#getTimeout(round));
	}

	public clear(): void {
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

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
