import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { RoundState } from "./round-state";

@injectable()
export class RoundStateRepository {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	#roundStates = new Map<string, RoundState>();

	async getRoundState(height, round): Promise<RoundState> {
		const key = `${height}-${round}`;

		if (!this.#roundStates.has(key)) {
			this.#roundStates.set(key, await this.#createRoundState(height, round));
		}

		return this.#roundStates.get(key)!;
	}

	// TODO: Bind to factory
	#createRoundState(height: number, round: number): Promise<RoundState> {
		return this.app.resolve(RoundState).configure(height, round);
	}
}
