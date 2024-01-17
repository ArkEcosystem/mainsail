import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Signature } from "./signature";

export * from "./signature";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Signature.Size).toConstantValue(96);
		this.app.bind(Identifiers.Cryptography.Signature.Instance).to(Signature).inSingletonScope();
	}

	public requiredByWorker(): boolean { return true }
}
