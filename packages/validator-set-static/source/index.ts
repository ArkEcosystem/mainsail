import { Providers, Services } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/contracts";
import { ValidatorSet } from "./validator-set";

export class ServiceProvider extends Providers.ServiceProvider {

	public async register(): Promise<void> {
		this.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("consensus.publicKey");

		this.app.bind(Identifiers.ValidatorSet).toConstantValue(await this.app.resolve(ValidatorSet).configure());
	}

}
