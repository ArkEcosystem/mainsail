import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { open, RootDatabase } from "lmdb";
import { join } from "path";

import { Storage } from "./storage.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerStorage();

		this.app.bind(Identifiers.ConsensusStorage.Service).to(Storage).inSingletonScope();
	}

	public async dispose(): Promise<void> {
		await this.#storeConsensusState();

		await this.app.get<RootDatabase>(Identifiers.ConsensusStorage.Root).close();
	}

	#registerStorage() {
		const storage = open({
			compression: true,
			name: "consensus",
			path: join(this.app.dataPath(), "consensus.mdb"),
		});
		this.app.bind(Identifiers.ConsensusStorage.Root).toConstantValue(storage);

		this.app
			.bind(Identifiers.ConsensusStorage.Storage.Proposal)
			.toConstantValue(storage.openDB({ name: "proposals" }));
		this.app
			.bind(Identifiers.ConsensusStorage.Storage.PreVote)
			.toConstantValue(storage.openDB({ name: "prevotes" }));
		this.app
			.bind(Identifiers.ConsensusStorage.Storage.PreCommit)
			.toConstantValue(storage.openDB({ name: "precommits" }));
		this.app
			.bind(Identifiers.ConsensusStorage.Storage.ConsensusState)
			.toConstantValue(storage.openDB({ name: "consensus" }));
	}

	async #storeConsensusState() {
		const roundStates = this.app
			.get<Contracts.Consensus.RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
			.getRoundStates();

		const storage = this.app.get<Storage>(Identifiers.ConsensusStorage.Service);

		await storage.clear();
		await storage.saveState(
			this.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service).getState(),
		);

		await storage.saveProposals(
			roundStates
				.map((roundState) => roundState.getProposal())
				.filter((proposal): proposal is Contracts.Crypto.Proposal => !!proposal),
		);
		await storage.savePrevotes(roundStates.flatMap((roundState) => roundState.getPrevotes()));
		await storage.savePrecommits(roundStates.flatMap((roundState) => roundState.getPrecommits()));
	}
}
