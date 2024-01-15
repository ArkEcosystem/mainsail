import { Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";

import { ProcessBlockAction } from "./actions/process-block";
import { BlockProcessor } from "./block-processor";
import { BlockVerifier } from "./block-verifier";
import { TransactionProcessor } from "./transaction-processor";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Processor.BlockVerifier).to(BlockVerifier).inSingletonScope();
		this.app.bind(Identifiers.Processor.BlockProcessor).to(BlockProcessor).inSingletonScope();
		this.app.bind(Identifiers.Processor.TransactionProcessor).to(TransactionProcessor).inSingletonScope();

		this.#registerActions();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	#registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.Kernel.Trigger.Service)
			.bind("processBlock", new ProcessBlockAction());
	}
}
