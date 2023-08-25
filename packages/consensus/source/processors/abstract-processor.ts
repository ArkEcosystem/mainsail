import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export abstract class AbstractProcessor implements Contracts.Consensus.IProcessor {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	public abstract process(data: Buffer): Promise<Contracts.Consensus.ProcessorResult>;

	protected hasValidHeightOrRound(message: { height: number; round: number }): boolean {
		return message.height === this.getConsensus().getHeight() && message.round >= this.getConsensus().getRound();
	}

	protected getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
