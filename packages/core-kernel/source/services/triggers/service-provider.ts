import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { Triggers } from "./triggers";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Triggers>(Identifiers.TriggerService).to(Triggers).inSingletonScope();
	}
}
