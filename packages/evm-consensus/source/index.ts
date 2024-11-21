import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deployer } from "./deployer.js";
import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";
import { Selector } from "./selector.js";
import { ConsensusContractService } from "./services/consensus-contract-service.js";
import { ValidatorSet } from "./validator-set.js";

export { Identifiers } from "./identifiers.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();

		this.app.bind(Identifiers.Proposer.Selector).to(Selector).inSingletonScope();
		this.app.bind(Identifiers.Evm.ContractService.Consensus).to(ConsensusContractService);

		this.app
			.bind(EvmConsensusIdentifiers.Internal.Addresses.Deployer)
			.toConstantValue("0x0000000000000000000000000000000000000001");
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).info("Booting EVM Consensus...");

		await this.app.resolve(Deployer).deploy();
	}
}
