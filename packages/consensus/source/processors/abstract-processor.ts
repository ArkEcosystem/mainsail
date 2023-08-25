import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class AbstractProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	protected hasValidHeightOrRound(message: { height: number; round: number }): boolean {
		return message.height === this.#getConsensus().getHeight() && message.round >= this.#getConsensus().getRound();
	}

	protected handle(roundState: Contracts.Consensus.IRoundState) {
		void this.#getConsensus().handle(roundState);
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
