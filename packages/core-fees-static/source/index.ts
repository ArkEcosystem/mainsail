import { Container, Providers } from "@arkecosystem/core-kernel";

import { FeeMatcher } from "./matcher";
import { ProcessorExtension } from "./processor-extension";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Container.Identifiers.Fee.Matcher).to(FeeMatcher).inSingletonScope();
		this.app.bind(Container.Identifiers.TransactionPoolProcessorExtension).to(ProcessorExtension);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
