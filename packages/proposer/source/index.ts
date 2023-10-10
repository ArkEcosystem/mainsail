import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ProposerPicker } from "./proposer-picker";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.ProposerPicker).to(ProposerPicker).inSingletonScope();
	}
}
