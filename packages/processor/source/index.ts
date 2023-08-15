import { Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";

import { ProcessBlockAction } from "./actions/process-block";
import { BlockProcessor } from "./block-processor";
import { BlockVerifier } from "./block-verifier";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.BlockVerifier).to(BlockVerifier).inSingletonScope();
		this.app.bind(Identifiers.BlockProcessor).to(BlockProcessor).inSingletonScope();

		this.#registerActions();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	#registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("processBlock", new ProcessBlockAction());
	}
}
