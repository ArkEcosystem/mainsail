import { Container, Providers } from "@arkecosystem/core-kernel";

import { FeeMatcher } from "./matcher";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Container.Identifiers.Fee.Matcher).to(FeeMatcher);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
