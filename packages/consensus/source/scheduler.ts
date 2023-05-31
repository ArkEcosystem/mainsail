import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Scheduler implements Contracts.Consensus.IScheduler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	#timeoutPropose?: NodeJS.Timeout;
	#timeoutPrevote?: NodeJS.Timeout;
	#timeoutPrecommit?: NodeJS.Timeout;

	public isTimeoutProposeSet(): boolean {
		return !!this.#timeoutPropose;
	}

	public isTimeoutPrevoteSet(): boolean {
		return !!this.#timeoutPrevote;
	}

	public isTimeoutPrecommitSet(): boolean {
		return !!this.#timeoutPrecommit;
	}

	public async scheduleTimeoutPropose(height: number, round: number): Promise<void> {
		this.#timeoutPropose = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPropose(height, round);
			this.#timeoutPropose = undefined;
		}, this.#getTimeout(round));
	}

	public async scheduleTimeoutPrevote(height: number, round: number): Promise<void> {
		this.#timeoutPrevote = setTimeout(async () => {
			await this.#getConsensus().onTimeoutPrevote(height, round);
			this.#timeoutPrevote = undefined;
		}, this.#getTimeout(round));
	}

	public async scheduleTimeoutPrecommit(height: number, round: number): Promise<void> {
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
