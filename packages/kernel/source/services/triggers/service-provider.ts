import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { Triggers } from "./triggers";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Triggers>(Identifiers.Kernel.Trigger.Service).to(Triggers).inSingletonScope();
	}
}
