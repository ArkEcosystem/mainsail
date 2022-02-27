import { BINDINGS, IValidator } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { registerFormats } from "./formats";
import { registerKeywords } from "./keywords";
import { schemas } from "./schemas";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		await this.registerFormats();

		await this.registerKeywords();

		await this.registerSchemas();
	}

	private async registerFormats(): Promise<void> {
		for (const [name, format] of Object.entries(registerFormats(this.app.get(BINDINGS.Configuration)))) {
			// @ts-ignore
			this.app.get<IValidator>(BINDINGS.Validator).addFormat(name, format);
		}
	}

	private async registerKeywords(): Promise<void> {
		for (const [name, format] of Object.entries(registerKeywords(this.app.get(BINDINGS.Configuration)))) {
			// @ts-ignore
			this.app.get<IValidator>(BINDINGS.Validator).addFormat(name, format);
		}
	}

	private async registerSchemas(): Promise<void> {
		for (const schema of Object.values(schemas)) {
			this.app.get<IValidator>(BINDINGS.Validator).addSchema(schema);
		}
	}
}
