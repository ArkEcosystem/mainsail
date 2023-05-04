import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Signature } from "./signature";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.Signature).toConstantValue(96);

		this.app.bind(Identifiers.Cryptography.Signature).to(Signature).inSingletonScope();
	}
}
