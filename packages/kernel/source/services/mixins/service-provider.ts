import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { MixinService } from "./mixins.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<MixinService>(Identifiers.Services.Mixin.Service).to(MixinService).inSingletonScope();
	}
}
