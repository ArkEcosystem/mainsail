import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { FeeRegistry } from "./registry.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Fee.Registry).to(FeeRegistry).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
