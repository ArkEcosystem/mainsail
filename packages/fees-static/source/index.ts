import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { FeeMatcher } from "./matcher.js";
import { ProcessorExtension } from "./processor-extension.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Fee.Type).toConstantValue("static");
		this.app.bind(Identifiers.Fee.Matcher).to(FeeMatcher).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.ProcessorExtension).to(ProcessorExtension);
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public requiredByWorker(): boolean {
		return true;
	}
}
