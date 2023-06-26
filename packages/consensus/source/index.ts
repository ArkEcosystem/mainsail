import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { RootDatabase } from "lmdb";

import { Consensus } from "./consensus";
import { Handler } from "./handler";
import { RoundStateRepository } from "./round-state-repository";
import { Scheduler } from "./scheduler";
import { Storage } from "./storage";
import { Bootstrapper } from "./bootstrapper";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.Handler).to(Handler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.RoundStateRepository).to(RoundStateRepository).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Scheduler).to(Scheduler).inSingletonScope();

		// Storage for uncommitted blocks
		const rootStorage = this.app.get<RootDatabase>(Identifiers.Database.RootStorage);
		this.app.bind(Identifiers.Database.ProposalStorage).toConstantValue(rootStorage.openDB({ name: "proposals" }));
		this.app.bind(Identifiers.Database.PrevoteStorage).toConstantValue(rootStorage.openDB({ name: "prevotes" }));
		this.app.bind(Identifiers.Database.PrecommitStorage).toConstantValue(rootStorage.openDB({ name: "precommits" }));
		this.app.bind(Identifiers.Database.ConsensusStorage).toConstantValue(rootStorage.openDB({ name: "consensus" }));
		this.app.bind(Identifiers.Consensus.Storage).to(Storage).inSingletonScope();

		this.app.bind(Identifiers.Consensus.Bootstrapper).to(Bootstrapper).inSingletonScope();

		this.app.bind(Identifiers.Consensus.Service).toConstantValue(this.app.resolve(Consensus));
	}
}
