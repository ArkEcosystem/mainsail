import { Providers } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/contracts";
import { ValidatorSet } from "./validator-set";

export class ServiceProvider extends Providers.ServiceProvider {

	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.ValidatorSet).to(ValidatorSet).inSingletonScope();
	}

}
