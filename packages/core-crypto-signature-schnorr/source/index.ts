import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Signatory } from "./signatory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.SignatureFactory).to(Signatory).inSingletonScope();
	}
}
