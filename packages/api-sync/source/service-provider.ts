import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Sync } from "./sync";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ApiSync).to(Sync).inSingletonScope();
	}

	public async boot(): Promise<void> { }

	public async dispose(): Promise<void> { }

}
