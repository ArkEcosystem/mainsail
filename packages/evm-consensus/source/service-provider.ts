import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import { assert } from "@mainsail/utils";
import { Address, getCreateAddress } from "viem";

import { Deployer } from "./deployer.js";
import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";
import { ConsensusContractCaller } from "./services/consensus-contract-caller.js";
import { ConsensusContractService } from "./services/consensus-contract-service.js";
import { ValidatorSet } from "./validator-set.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const deployerAddress: Address = "0x0000000000000000000000000000000000000001";

		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();
		this.app
			.bind(EvmConsensusIdentifiers.Internal.ConsensusContractCaller)
			.to(ConsensusContractCaller)
			.inSingletonScope();
		this.app.bind(Identifiers.Evm.ContractService.Consensus).to(ConsensusContractService);
		this.app.bind(EvmConsensusIdentifiers.Internal.Deployer).to(Deployer).inSingletonScope();
		this.app.bind(EvmConsensusIdentifiers.Internal.Addresses.Deployer).toConstantValue(deployerAddress);

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Consensus)
			.toConstantValue(getCreateAddress({ from: deployerAddress, nonce: 1n }));
		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Usernames)
			.toConstantValue(getCreateAddress({ from: deployerAddress, nonce: 3n }));
		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment)
			.toConstantValue(getCreateAddress({ from: deployerAddress, nonce: 5n }));
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).info("Booting EVM Consensus...");

		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		assert.defined(genesisBlock);

		await this.app.get<Deployer>(EvmConsensusIdentifiers.Internal.Deployer).deploy({
			generatorAddress: genesisBlock.block.proposer,
			initialBlockNumber: genesisBlock.block.number,
			initialSupply: this.#calculateInitialSupply(genesisBlock),
			timestamp: genesisBlock.block.timestamp,
		});
	}

	#calculateInitialSupply(genesisBlock: Contracts.Crypto.CommitJson): string {
		const generatorAddress = genesisBlock.block.proposer;

		let supply = 0n;

		for (const transaction of genesisBlock.block.transactions.filter((tx) => tx.from === generatorAddress)) {
			supply += BigInt(transaction.value);
		}

		return supply.toString();
	}
}

export { Deployer } from "./deployer.js";
