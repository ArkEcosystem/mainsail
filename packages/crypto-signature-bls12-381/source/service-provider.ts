import { Identifiers } from "@mainsail/constants";
import { injectable, Selectors } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { schemas } from "./schemas.js";
import { Serializer } from "./serializer.js";
import { Signature } from "./signature.js";


@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Signature.Size)
			.toConstantValue(96)
			.when(Selectors.anyAncestorOrTargetTagged("type", "consensus"));
		this.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.to(Signature)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTagged("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Signature.Serializer)
			.to(Serializer)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTagged("type", "consensus"));

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}

}
