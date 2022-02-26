import Interfaces from "@arkecosystem/core-crypto-contracts";
import { Managers } from "@arkecosystem/crypto";

import { Application } from "../../contracts/kernel";
import { Identifiers, inject, injectable } from "../../ioc";
import { ConfigRepository } from "../../services/config";
import { assert } from "../../utils";
import { Bootstrapper } from "../interfaces";

@injectable()
export class LoadCryptography implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		this.configRepository.hasAll([
			"crypto.genesisBlock",
			"crypto.exceptions",
			"crypto.milestones",
			"crypto.network",
		])
			? this.fromConfigRepository()
			: this.fromPreset();

		const networkConfig: Interfaces.NetworkConfig | undefined = Managers.configManager.all();

		assert.defined<Interfaces.NetworkConfig>(networkConfig);

		this.app.bind<Interfaces.NetworkConfig>(Identifiers.Crypto).toConstantValue(networkConfig);
	}

	private fromPreset(): void {
		Managers.configManager.setFromPreset(this.app.network() as any);
	}

	private fromConfigRepository(): void {
		const config: Interfaces.NetworkConfig = {
			exceptions: this.configRepository.get<Interfaces.IExceptions>("crypto.exceptions")!,
			genesisBlock: this.configRepository.get<Interfaces.IBlockJson>("crypto.genesisBlock")!,
			milestones: this.configRepository.get<Array<Record<string, any>>>("crypto.milestones")!,
			network: this.configRepository.get<Interfaces.Network>("crypto.network")!,
		};

		Managers.configManager.setConfig(config);
	}
}
