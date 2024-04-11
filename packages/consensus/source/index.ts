import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { Aggregator } from "./aggregator.js";
import { Bootstrapper } from "./bootstrapper.js";
import { CommitState } from "./commit-state.js";
import { Consensus } from "./consensus.js";
import { CommitProcessor, PrecommitProcessor, PrevoteProcessor, ProposalProcessor } from "./processors/index.js";
import { RoundStateRepository } from "./round-state-repository.js";
import { Scheduler } from "./scheduler.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.Aggregator).to(Aggregator).inSingletonScope();
		this.app.bind(Identifiers.Consensus.RoundStateRepository).to(RoundStateRepository).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Scheduler).to(Scheduler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Processor.Proposal).to(ProposalProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Processor.PreVote).to(PrevoteProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Processor.PreCommit).to(PrecommitProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Processor.Commit).to(CommitProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(new Utils.Lock());

		this.app
			.bind(Identifiers.Consensus.CommitState.Factory)
			.toFactory(
				(context: interfaces.Context) => (commit: Contracts.Crypto.Commit) =>
					context.container.resolve(CommitState).configure(commit),
			);

		this.app.bind(Identifiers.Consensus.Bootstrapper).to(Bootstrapper).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Service).toConstantValue(this.app.resolve(Consensus));
	}

	public async dispose(): Promise<void> {
		const consensus = this.app.get<Consensus>(Identifiers.Consensus.Service);
		await consensus.dispose();
	}
}
