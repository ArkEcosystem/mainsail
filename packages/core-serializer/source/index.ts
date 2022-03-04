import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Serializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Serializer).to(Serializer);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}

export { Serializer } from "./serializer";
