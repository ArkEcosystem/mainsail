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

const DEPLOYER_ADDRESS: Address = "0x0000000000000000000000000000000000000001";


@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();
		this.app
			.bind(EvmConsensusIdentifiers.Internal.ConsensusContractCaller)
			.to(ConsensusContractCaller)
			.inSingletonScope();
		this.app.bind(Identifiers.Evm.ContractService.Consensus).to(ConsensusContractService);
		this.app.bind(EvmConsensusIdentifiers.Internal.Deployer).to(Deployer).inSingletonScope();
		this.app.bind(EvmConsensusIdentifiers.Internal.Addresses.Deployer).toConstantValue(DEPLOYER_ADDRESS);

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Consensus)
			.toConstantValue(getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: 1n }));
		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Usernames)
			.toConstantValue(getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: 3n }));
		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment)
			.toConstantValue(getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: 5n }));

		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		assert.defined(genesisBlock);

		const genesisInfo: Contracts.Evm.GenesisInfo = {
			account: genesisBlock.block.proposer,
			deployerAccount: DEPLOYER_ADDRESS,
			initialBlockNumber: BigInt(genesisBlock.block.number),
			initialSupply: this.#calculateInitialSupply(genesisBlock),
			timestamp: BigInt(genesisBlock.block.timestamp),

			usernameContract: this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Usernames), // PROXY Uses nonce 3
			validatorContract: this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus), // PROXY Uses nonce 1
		};

		this.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue(genesisInfo);
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).info("Booting EVM Consensus...");

		await this.app.get<Deployer>(EvmConsensusIdentifiers.Internal.Deployer).deploy();
	}

	#calculateInitialSupply(genesisBlock: Contracts.Crypto.CommitJson): bigint {
		const generatorAddress = genesisBlock.block.proposer;

		let supply = 0n;

		for (const transaction of genesisBlock.block.transactions.filter((tx) => tx.from === generatorAddress)) {
			supply += BigInt(transaction.value);
		}

		return supply;
	}
}

export { Deployer } from "./deployer.js";
