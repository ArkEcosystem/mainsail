import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Serializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Serializer).to(Serializer).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
