import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { HashFactory } from "./hash.factory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.HASH256).toConstantValue(32);
		this.app.bind(Identifiers.Cryptography.Size.RIPEMD160).toConstantValue(20);
		this.app.bind(Identifiers.Cryptography.Size.SHA256).toConstantValue(32);

		this.app.bind(Identifiers.Cryptography.HashFactory).to(HashFactory).inSingletonScope();
	}
}
