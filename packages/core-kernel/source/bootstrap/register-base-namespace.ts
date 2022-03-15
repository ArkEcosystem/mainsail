import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";

import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterBaseNamespace implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		const token: string = this.app.token();
		const network: string = this.app.network();

		if (!token || !network) {
			throw new Exceptions.NetworkCannotBeDetermined();
		}

		this.app.bind<string>(Identifiers.ApplicationNamespace).toConstantValue(`${token}-${network}`);
		this.app.bind<string>(Identifiers.ApplicationDirPrefix).toConstantValue(`${token}/${network}`);
	}
}
