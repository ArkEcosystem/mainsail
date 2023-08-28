import { Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import { RootDatabase } from "lmdb";

import { Aggregator } from "./aggregator";
import { Bootstrapper } from "./bootstrapper";
import { Consensus } from "./consensus";
import { CommittedBlockProcessor, PrecommitProcessor, PrevoteProcessor, ProposalProcessor } from "./processors";
import { ProposerPicker } from "./proposer-picker";
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
		this.app.bind(Identifiers.Consensus.ProposerPicker).to(ProposerPicker).inSingletonScope();
		this.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(new Utils.Lock());

		// Storage for uncommitted blocks
		const consensusStorage = this.app.get<RootDatabase>(Identifiers.Database.ConsensusStorage);

		this.app
			.bind(Identifiers.Database.ProposalStorage)
			.toConstantValue(consensusStorage.openDB({ name: "proposals" }));
		this.app
			.bind(Identifiers.Database.PrevoteStorage)
			.toConstantValue(consensusStorage.openDB({ name: "prevotes" }));
		this.app
			.bind(Identifiers.Database.PrecommitStorage)
			.toConstantValue(consensusStorage.openDB({ name: "precommits" }));
		this.app
			.bind(Identifiers.Database.ConsensusStateStorage)
			.toConstantValue(consensusStorage.openDB({ name: "consensus" }));
		this.app.bind(Identifiers.Consensus.Storage).to(Storage).inSingletonScope();

		this.app.bind(Identifiers.Consensus.Bootstrapper).to(Bootstrapper).inSingletonScope();

		this.app.bind(Identifiers.Consensus.Service).toConstantValue(this.app.resolve(Consensus));
	}
}
