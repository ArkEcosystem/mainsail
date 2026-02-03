import { Identifiers } from "@mainsail/constants";
import { injectable, Selectors } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { schemas } from "./schemas.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Size)
			.toConstantValue(48)
			.when(Selectors.anyAncestorOrTargetTagged("type", "consensus"));

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
