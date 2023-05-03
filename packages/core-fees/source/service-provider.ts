import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/core-kernel";

import { FeeRegistry } from "./registry";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Fee.Registry).to(FeeRegistry);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
