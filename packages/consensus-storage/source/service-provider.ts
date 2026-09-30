import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
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
			.toConstantValue(storage.openDB({ encoding: "binary", name: "proposals" }));
		this.app
			.bind(Identifiers.ConsensusStorage.Storage.Message)
			.toConstantValue(storage.openDB({ encoding: "binary", name: "message" }));
		this.app
			.bind(Identifiers.ConsensusStorage.Storage.ConsensusState)
			.toConstantValue(storage.openDB({ name: "consensus" }));
	}
}
