import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ConsensusAbi, ERC1967ProxyAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { assert } from "@mainsail/utils";
import { Address, encodeDeployData, encodeFunctionData, getCreateAddress, Hex, toBytes } from "viem";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

interface ProxyDeployment {
	readonly abi: Record<string, unknown>[];
	readonly addressIdentifier: symbol;
	readonly implementationAddress: string;
	readonly initializerArguments?: readonly unknown[];
	readonly name: string;
	readonly nonce: number;
}

export interface GenesisBlockInfo {
	readonly timestamp: number;
	readonly initialSupply: string;
	readonly generatorAddress: string;
	readonly initialBlockNumber: number;
}

@injectable()
export class Deployer {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(EvmConsensusIdentifiers.Internal.Addresses.Deployer)
	private readonly deployerAddress!: Address;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	#genesisBlockInfo!: GenesisBlockInfo;
	#genesisBlockContext!: Contracts.Evm.BlockContext;

	#nonce = 0;
	#needsCommit = false;

	#generateTxHash = () =>
		this.hashFactory.sha256(Buffer.from(`tx-${this.deployerAddress}-${this.#nonce++}`, "utf8")).toString("hex");

	public async deploy(genesisBlockInfo: GenesisBlockInfo): Promise<void> {
		this.#genesisBlockInfo = genesisBlockInfo;

		const { commitKey } = this.#getBlockContext();

		await this.#initialize(commitKey);

		const consensusAddress = await this.#deployContract(ConsensusAbi.bytecode.object, 0, "Consensus");
		await this.#deployProxy({
			abi: ConsensusAbi.abi,
			addressIdentifier: EvmConsensusIdentifiers.Contracts.Addresses.Consensus,
			implementationAddress: consensusAddress,
			initializerArguments: [this.configuration.getMilestone().validatorRegistrationFee],
			name: "Consensus",
			nonce: 1,
		});

		const usernamesAddress = await this.#deployContract(UsernamesAbi.bytecode.object, 2, "Usernames");
		await this.#deployProxy({
			abi: UsernamesAbi.abi,
			addressIdentifier: EvmConsensusIdentifiers.Contracts.Addresses.Usernames,
			implementationAddress: usernamesAddress,
			name: "Usernames",
			nonce: 3,
		});

		const multiPaymentAddress = await this.#deployContract(
			MultiPaymentAbi.bytecode.object,
			4,
			"MultiPayment",
		);
		await this.#deployProxy({
			abi: MultiPaymentAbi.abi,
			addressIdentifier: EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment,
			implementationAddress: multiPaymentAddress,
			name: "MultiPayment",
			nonce: 5,
		});

		if (this.#needsCommit) {
			await this.evm.onCommit({
				commitKey,
				getBlock: () => ({ ...commitKey, number: commitKey.blockNumber }),
				setAccountUpdates: () => ({}),
			} as unknown as Contracts.Processor.ProcessableUnit);
		}
	}

	async #initialize(commitKey: Contracts.Evm.CommitKey): Promise<void> {
		assert.defined(this.#genesisBlockInfo);

		const genesisInfo = {
			account: this.#genesisBlockInfo.generatorAddress,
			deployerAccount: this.deployerAddress,
			initialBlockNumber: BigInt(this.#genesisBlockInfo.initialBlockNumber),
			initialSupply: BigInt(this.#genesisBlockInfo.initialSupply),

			usernameContract: this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Usernames), // PROXY Uses nonce 3
			validatorContract: this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus), // PROXY Uses nonce 1
		};

		this.#genesisBlockContext = this.#getBlockContext();

		await this.evm.prepareNextCommit({ blockContext: this.#genesisBlockContext });
		await this.evm.initializeGenesis(genesisInfo);

		this.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue(genesisInfo);
	}

	#getBlockContext(): Contracts.Evm.BlockContext {
		const milestone = this.configuration.getMilestone();

		// Commit Key chosen in a way such that it does not conflict with blocks.
		return {
			commitKey: { blockNumber: BigInt(2 ** 32 + 1), round: BigInt(0) },
			gasLimit: BigInt(milestone.block.maxGasLimit),
			timestamp: BigInt(this.#genesisBlockInfo.timestamp),
			validatorAddress: this.deployerAddress,
		};
	}

	#getSpecId(): Contracts.Evm.SpecId {
		const milestone = this.configuration.getMilestone();
		return milestone.evmSpec;
	}

	async #deployContract(data: string, nonce: number, label: string): Promise<string> {
		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.from(toBytes(data)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(nonce),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error(`failed to deploy ${label} contract`);
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: BigInt(nonce) })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(`Deployed ${label} contract from ${this.deployerAddress} to ${receipt.contractAddress}`);

		return receipt.contractAddress!;
	}

	async #deployProxy(deployment: ProxyDeployment): Promise<void> {
		// Encode the initializer call
		const initializerCalldata = encodeFunctionData({
			abi: deployment.abi,
			args: deployment.initializerArguments,
			functionName: "initialize",
		});

		// Prepare the constructor arguments for the proxy contract
		const deployData = encodeDeployData({
			abi: ERC1967ProxyAbi.abi,
			args: [deployment.implementationAddress, initializerCalldata],
			bytecode: ERC1967ProxyAbi.bytecode.object as Hex,
		});

		const address = await this.#deployContract(deployData, deployment.nonce, `${deployment.name} PROXY`);

		if (address !== this.app.get<string>(deployment.addressIdentifier)) {
			throw new Error("Contract address mismatch");
		}

		this.#emitContractDeployed({
			activeImplementation: deployment.implementationAddress,
			address,
			implementations: [{ abi: deployment.abi, address: deployment.implementationAddress }],
			name: deployment.name,
			proxy: "UUPS",
		});
	}

	#emitContractDeployed(event: Contracts.Evm.DeployerContract): void {
		void this.events.dispatch(Events.DeployerEvent.ContractCreated, event);
	}

	async #processTransaction(context: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.TransactionReceipt> {
		const { receipt } = await this.evm.getReceipt(this.#genesisBlockContext.commitKey.blockNumber, context.txHash);
		if (receipt) {
			return receipt;
		}

		const result = await this.evm.process(context);

		this.#needsCommit = true;

		return result.receipt;
	}
}
