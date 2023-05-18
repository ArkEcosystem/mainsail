import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Signature } from "./signature";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const config = this.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration);

		// TODO: consider different approach
		const consensusSignature = config.getMilestone().consensusSignature;
		if (consensusSignature === "bls") {
			this.app.bind(Identifiers.Consensus.Size.Signature).toConstantValue(96);
			this.app.bind(Identifiers.Consensus.Signature).to(Signature).inSingletonScope();
		} else {
			this.app.bind(Identifiers.Cryptography.Size.Signature).toConstantValue(96);
			this.app.bind(Identifiers.Cryptography.Signature).to(Signature).inSingletonScope();
		}
	}
}
