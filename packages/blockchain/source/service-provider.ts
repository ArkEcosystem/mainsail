import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Blockchain } from "./blockchain";
import { StateMachine } from "./state-machine";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.StateMachine).to(StateMachine).inSingletonScope();
		this.app.bind(Identifiers.BlockchainService).to(Blockchain).inSingletonScope();
	}

	public async boot(): Promise<void> {
		await this.app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService).dispose();
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
