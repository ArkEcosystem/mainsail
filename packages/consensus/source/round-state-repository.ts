import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { RoundState } from "./round-state.js";

@injectable()
export class RoundStateRepository implements Contracts.Consensus.RoundStateRepository {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#roundStates = new Map<string, Contracts.Consensus.RoundState>();

	public getRoundState(blockNumber: number, round: number): Contracts.Consensus.RoundState {
		const key = `${blockNumber}-${round}`;

		let roundState = this.#roundStates.get(key);
		if (!roundState) {
			roundState = this.#createRoundState(blockNumber, round);
			this.#roundStates.set(key, roundState);
		}

		return roundState;
	}

	public getRoundStates(): Contracts.Consensus.RoundState[] {
		return [...this.#roundStates.values()];
	}

	public clear(): void {
		this.#roundStates.clear();
	}

	#createRoundState(blockNumber: number, round: number): Contracts.Consensus.RoundState {
		return this.app.resolve(RoundState).configure(blockNumber, round);
	}
}
