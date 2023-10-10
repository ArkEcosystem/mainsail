import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ProposerSelector } from "./proposer-selector";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.ProposerPicker).to(ProposerSelector).inSingletonScope();
	}
}
