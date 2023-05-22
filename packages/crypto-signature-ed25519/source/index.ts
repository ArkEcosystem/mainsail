import { Identifiers } from "@mainsail/contracts";
import { Selectors } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { Signature } from "./signature";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.Signature).toConstantValue(64)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));

		this.app.bind(Identifiers.Cryptography.Signature).to(Signature).inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
	}
}
