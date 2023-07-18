import { Providers } from "@mainsail/kernel";


export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
