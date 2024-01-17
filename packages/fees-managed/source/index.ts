import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { FeeMatcher } from "./matcher";
import { ProcessorExtension } from "./processor-extension";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Fee.Type).toConstantValue("managed");
		this.app.bind(Identifiers.Fee.Matcher).to(FeeMatcher).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.ProcessorExtension).to(ProcessorExtension);
	}

	public configSchema(): object {
		return Joi.object({
			satoshiPerByte: Joi.number().required(),
		});
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public requiredByWorker(): boolean { return true }
}
