import { Application } from "../../contracts/kernel";
import { NetworkCannotBeDetermined } from "../../exceptions/config";
import { Identifiers, inject, injectable } from "../../ioc";
import { Bootstrapper } from "../interfaces";

@injectable()
export class RegisterBaseNamespace implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Application;

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
