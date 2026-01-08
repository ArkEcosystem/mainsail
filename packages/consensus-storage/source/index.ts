import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { open, RootDatabase } from "lmdb";
import { join } from "path";

import { Service } from "./service.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerStorage();

		this.app.bind(Identifiers.ConsensusStorage.Service).to(Service).inSingletonScope();
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
			.bind(Identifiers.ConsensusStorage.Storage.Message)
			.toConstantValue(storage.openDB({ name: "message" }));
		this.app
			.bind(Identifiers.ConsensusStorage.Storage.ConsensusState)
			.toConstantValue(storage.openDB({ name: "consensus" }));
	}

	async #storeConsensusState() {
		const roundStates = this.app
			.get<Contracts.Consensus.RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
			.getRoundStates();

		const storage = this.app.get<Service>(Identifiers.ConsensusStorage.Service);

		const precommits = roundStates.flatMap((roundState) => roundState.getPrecommits());
		const prevotes = roundStates.flatMap((roundState) => roundState.getPrevotes());

		await storage.persist({
			messages: [...prevotes, ...precommits],
			proposals: roundStates
				.map((roundState) => roundState.getProposal())
				.filter((proposal): proposal is Contracts.Crypto.Proposal => !!proposal),
			state: this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service).getState(),
		});
	}
}
