import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import { RootDatabase } from "lmdb";

import { Aggregator } from "./aggregator";
import { Bootstrapper } from "./bootstrapper";
import { CommittedBlockState } from "./committed-block-state";
import { Consensus } from "./consensus";
import { CommittedBlockProcessor, PrecommitProcessor, PrevoteProcessor, ProposalProcessor } from "./processors";
import { RoundStateRepository } from "./round-state-repository";
import { Scheduler } from "./scheduler";
import { Storage } from "./storage";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.Aggregator).to(Aggregator).inSingletonScope();
		this.app.bind(Identifiers.Consensus.RoundStateRepository).to(RoundStateRepository).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Scheduler).to(Scheduler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.ProposalProcessor).to(ProposalProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.PrevoteProcessor).to(PrevoteProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.PrecommitProcessor).to(PrecommitProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.CommittedBlockProcessor).to(CommittedBlockProcessor).inSingletonScope();
		this.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(new Utils.Lock());

		this.app
			.bind(Identifiers.Consensus.CommittedBlockStateFactory)
			.toFactory(
				(context: interfaces.Context) => (committedBlock: Contracts.Crypto.CommittedBlock) =>
					context.container.resolve(CommittedBlockState).configure(committedBlock),
			);

		// Storage for prevotes, precommits and proposals
		const storage = this.app.get<RootDatabase>(Identifiers.Database.ConsensusStorage);
		this.app.bind(Identifiers.Database.ProposalStorage).toConstantValue(storage.openDB({ name: "proposals" }));
		this.app.bind(Identifiers.Database.PrevoteStorage).toConstantValue(storage.openDB({ name: "prevotes" }));
		this.app.bind(Identifiers.Database.PrecommitStorage).toConstantValue(storage.openDB({ name: "precommits" }));
		this.app
			.bind(Identifiers.Database.ConsensusStateStorage)
			.toConstantValue(storage.openDB({ name: "consensus" }));
		this.app.bind(Identifiers.Consensus.Storage).to(Storage).inSingletonScope();

		this.app.bind(Identifiers.Consensus.Bootstrapper).to(Bootstrapper).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Service).toConstantValue(this.app.resolve(Consensus));
	}

	public async dispose(): Promise<void> {
		const consensus = this.app.get<Consensus>(Identifiers.Consensus.Service);
		await consensus.dispose();

		const storage = this.app.get<Storage>(Identifiers.Consensus.Storage);
		await storage.saveState(consensus.getState());

		const roundStates = this.app
			.get<RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
			.getRoundStates();

		const proposals = roundStates
			.map((roundState) => roundState.getProposal())
			.filter((proposal): proposal is Contracts.Crypto.Proposal => !!proposal);
		await storage.saveProposals(proposals);

		const prevotes = roundStates.flatMap((roundState) => roundState.getPrevotes());
		await storage.savePrevotes(prevotes);

		const precommits = roundStates.flatMap((roundState) => roundState.getPrecommits());
		await storage.savePrecommits(precommits);
	}
}
