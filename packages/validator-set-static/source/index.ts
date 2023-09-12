import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { ValidatorSet } from "./validator-set";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// TODO: Rename and remove attribute
		this.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.WalletAttributes)
			.set("validatorConsensusPublicKey", Contracts.State.AttributeType.String);

		this.app.bind(Identifiers.ValidatorSet).to(ValidatorSet).inSingletonScope();
	}
}
