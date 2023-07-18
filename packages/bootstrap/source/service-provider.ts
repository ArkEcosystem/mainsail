import { Providers } from "@mainsail/kernel";

import { Bootstrapper } from "./bootstrapper";


export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
	}

	public async boot(): Promise<void> {
		await this.app.resolve(Bootstrapper).bootstrap();
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
