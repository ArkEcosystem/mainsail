import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Consensus } from "./consensus";
import { Handler } from "./handler";
import { RoundStateRepository } from "./round-state-repository";
import { Scheduler } from "./scheduler";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.Handler).to(Handler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.RoundStateRepository).to(RoundStateRepository).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Scheduler).to(Scheduler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Service).toConstantValue(this.app.resolve(Consensus));
	}
}
