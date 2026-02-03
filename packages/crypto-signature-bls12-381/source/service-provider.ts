import { Identifiers } from "@mainsail/constants";
import { injectable, Selectors } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

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
	}
}
