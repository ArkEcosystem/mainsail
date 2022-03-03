import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Kernel } from "@arkecosystem/core-contracts";

import { NetworkCannotBeDetermined } from "../../exceptions/config";
import { Bootstrapper } from "../interfaces";

@injectable()
export class RegisterBaseNamespace implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Kernel.Application;

	public async bootstrap(): Promise<void> {
		const token: string = this.app.token();
		const network: string = this.app.network();

		if (!token || !network) {
			throw new NetworkCannotBeDetermined();
		}

		this.app.bind<string>(Identifiers.ApplicationNamespace).toConstantValue(`${token}-${network}`);
		this.app.bind<string>(Identifiers.ApplicationDirPrefix).toConstantValue(`${token}/${network}`);
	}
}
