import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";
import { PublicKeyFactory } from "./public";
import { PublicKeySerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
		this.app.bind(BINDINGS.Identity.PrivateKeyFactory).to(PrivateKeyFactory).inSingletonScope();
		this.app.bind(BINDINGS.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
		this.app.bind(BINDINGS.Identity.PublicKeySerializer).to(PublicKeySerializer).inSingletonScope();
	}
}
