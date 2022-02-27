import Interfaces, { BINDINGS, IConfiguration } from "@arkecosystem/core-crypto-contracts";

import { Application } from "../../contracts/kernel";
import { Identifiers, inject, injectable } from "../../ioc";
import { ConfigRepository } from "../../services/config";
import { assert } from "../../utils";
import { Bootstrapper } from "../interfaces";

@injectable()
export class LoadCryptography implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app: Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository: ConfigRepository;

	@inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	public async bootstrap(): Promise<void> {
		this.fromConfigRepository();

		const networkConfig: Interfaces.NetworkConfig | undefined = this.configuration.all();

		assert.defined<Interfaces.NetworkConfig>(networkConfig);

		this.app.bind<Interfaces.NetworkConfig>(Identifiers.Crypto).toConstantValue(networkConfig);
	}

	private fromConfigRepository(): void {
		const config: Interfaces.NetworkConfig = {
			exceptions: this.configRepository.get<Interfaces.IExceptions>("crypto.exceptions")!,
			genesisBlock: this.configRepository.get<Interfaces.IBlockJson>("crypto.genesisBlock")!,
			milestones: this.configRepository.get<Array<Record<string, any>>>("crypto.milestones")!,
			network: this.configRepository.get<Interfaces.Network>("crypto.network")!,
		};

		this.configuration.setConfig(config);
	}
}
