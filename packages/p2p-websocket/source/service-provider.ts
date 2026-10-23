import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		//
	}

	public async boot(): Promise<void> {
		//
	}

	public async dispose(): Promise<void> {
		//
	}
}
