import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { assert, BigNumber } from "@mainsail/utils";

import { Deployer } from "./deployer.js";
import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";
import { ConsensusContractService } from "./services/consensus-contract-service.js";
import { ValidatorSet } from "./validator-set.js";

export { Identifiers } from "./identifiers.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();

		this.app.bind(Identifiers.Evm.ContractService.Consensus).to(ConsensusContractService);

		this.app
			.bind(EvmConsensusIdentifiers.Internal.Addresses.Deployer)
			.toConstantValue("0x0000000000000000000000000000000000000001");
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).info("Booting EVM Consensus...");

		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		assert.defined(genesisBlock);

		this.app.bind(EvmConsensusIdentifiers.Internal.Deployer).to(Deployer).inSingletonScope();

		await this.app.get<Deployer>(EvmConsensusIdentifiers.Internal.Deployer).deploy({
			generatorAddress: genesisBlock.block.proposer,
			initialBlockNumber: genesisBlock.block.number,
			initialSupply: this.#calculateInitialSupply(genesisBlock),
			timestamp: genesisBlock.block.timestamp,
		});
	}

	#calculateInitialSupply(genesisBlock: Contracts.Crypto.CommitJson): string {
		const generatorAddress = genesisBlock.block.proposer;

		let supply = BigNumber.ZERO;

		for (const transaction of genesisBlock.block.transactions.filter((tx) => tx.from === generatorAddress)) {
			supply = supply.plus(transaction.value);
		}

		return supply.toString();
	}
}

export { Deployer } from "./deployer.js";
