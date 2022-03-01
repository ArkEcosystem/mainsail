import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Signature } from "./signature";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Signature).to(Signature).inSingletonScope();
	}
}
