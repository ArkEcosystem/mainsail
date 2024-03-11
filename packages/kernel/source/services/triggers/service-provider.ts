import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { Triggers } from "./triggers.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Triggers>(Identifiers.Services.Trigger.Service).to(Triggers).inSingletonScope();
	}
}
