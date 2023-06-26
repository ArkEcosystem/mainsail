import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { RoundState } from "./round-state";

@injectable()
export class RoundStateRepository implements Contracts.Consensus.IRoundStateRepository {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	#roundStates = new Map<string, Contracts.Consensus.IRoundState>();

	async getRoundState(height: number, round: number, seed: string): Promise<Contracts.Consensus.IRoundState> {
		const key = `${height}-${round}`;

		if (!this.#roundStates.has(key)) {
			this.#roundStates.set(key, await this.#createRoundState(height, round, seed));
		}

		return this.#roundStates.get(key)!;
	}

	// TODO: Bind to factory
	#createRoundState(height: number, round: number, seed: string): Promise<Contracts.Consensus.IRoundState> {
		return this.app.resolve(RoundState).configure(height, round, seed);
	}
}
