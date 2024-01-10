import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import dayjs from "dayjs";

@injectable()
export class AbstractProcessor {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.CommitLock)
	protected readonly commitLock!: Contracts.Kernel.Lock;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	protected hasValidHeightOrRound(message: { height: number; round: number }): boolean {
		return message.height === this.getConsensus().getHeight() && message.round >= this.getConsensus().getRound();
	}

	protected isRoundInBounds(message: { round: number }): boolean {
		const earliestTime =
			Utils.timestampCalculator.calculateMinimalTimestamp(
				this.stateService.getStateStore().getLastBlock(),
				message.round,
				this.cryptoConfiguration,
			) - 500; // Allow time drift between nodes

		return dayjs().isAfter(dayjs(earliestTime));
	}

	protected getConsensus(): Contracts.Consensus.ConsensusService {
		return this.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);
	}
}
