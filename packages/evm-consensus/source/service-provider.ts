import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import { Address, getCreateAddress } from "viem";

import { Deployer } from "./deployer.js";
import { ConsensusContractCaller } from "./services/consensus-contract-caller.js";
import { ConsensusContractService } from "./services/consensus-contract-service.js";
import { ValidatorSet } from "./validator-set.js";

const DEPLOYER_ADDRESS: Address = "0x0000000000000000000000000000000000000001";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();
		this.app.bind(Identifiers.EvmConsensus.ConsensusContractCaller).to(ConsensusContractCaller).inSingletonScope();
		this.app.bind(Identifiers.Evm.ContractService.Consensus).to(ConsensusContractService);
		this.app.bind(Identifiers.EvmConsensus.Deployer).to(Deployer).inSingletonScope();
		this.app.bind(Identifiers.EvmConsensus.DeployerAddress).toConstantValue(DEPLOYER_ADDRESS);

		this.app
			.bind(Identifiers.EvmConsensus.Contracts.Consensus)
			.toConstantValue(getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: 1n }));
		this.app
			.bind(Identifiers.EvmConsensus.Contracts.Usernames)
			.toConstantValue(getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: 3n }));
		this.app
			.bind(Identifiers.EvmConsensus.Contracts.MultiPayment)
			.toConstantValue(getCreateAddress({ from: DEPLOYER_ADDRESS, nonce: 5n }));

		const cryptoConfig = this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		const genesisBlock = cryptoConfig.getGenesisCommit().block;

		const genesisInfo: Contracts.Evm.GenesisInfo = {
			account: genesisBlock.proposer,
			deployerAccount: DEPLOYER_ADDRESS,
			initialBlockNumber: BigInt(genesisBlock.number),
			initialSupply: this.#calculateInitialSupply(genesisBlock),

			usernameContract: this.app.get<string>(Identifiers.EvmConsensus.Contracts.Usernames), // PROXY Uses nonce 3
			validatorContract: this.app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus), // PROXY Uses nonce 1
		};

		this.app.bind(Identifiers.EvmConsensus.GenesisInfo).toConstantValue(genesisInfo);
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).info("Booting EVM Consensus...");

		await this.app.get<Deployer>(Identifiers.EvmConsensus.Deployer).deploy();
	}

	#calculateInitialSupply(genesisBlock: Contracts.Crypto.BlockJsonCrypto): bigint {
		let supply = 0n;

		for (const transaction of genesisBlock.transactions.filter((tx) => tx.from === genesisBlock.proposer)) {
			supply += BigInt(transaction.value);
		}

		return supply;
	}
}
