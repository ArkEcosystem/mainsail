import { Identifiers } from "@mainsail/core-contracts";
import { Providers } from "@mainsail/core-kernel";

import { FeeMatcher } from "./matcher";
import { ProcessorExtension } from "./processor-extension";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Fee.Type).toConstantValue("static");
		this.app.bind(Identifiers.Fee.Matcher).to(FeeMatcher).inSingletonScope();
		this.app.bind(Identifiers.TransactionPoolProcessorExtension).to(ProcessorExtension);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
