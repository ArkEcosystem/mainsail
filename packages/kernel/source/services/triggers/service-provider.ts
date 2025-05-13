import { injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { Triggers } from "./triggers.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Services.Trigger.Service).to(Triggers).inSingletonScope();
	}
}
