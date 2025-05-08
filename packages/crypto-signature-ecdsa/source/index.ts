import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Signature } from "./signature.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Signature.Size)
			.toConstantValue(32 + /* r */ 32 + /* s */ +1 /* v */)
			.whenAnyAncestorTagged("type", "wallet");

		this.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.to(Signature)
			.inSingletonScope()
			.whenAnyAncestorTagged("type", "wallet");
	}
}
