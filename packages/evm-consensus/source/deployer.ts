import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ConsensusAbi, ERC1967ProxyAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { assert } from "@mainsail/utils";
import { Address, encodeDeployData, encodeFunctionData, getCreateAddress, Hex, toBytes } from "viem";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

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

		const consensusContractAddress = await this.#deployConsensusContract();
		await this.#deployConsensusProxy(consensusContractAddress);

		const usernamesContractAddress = await this.#deployUsernamesContract();
		await this.#deployUsernamesProxy(usernamesContractAddress);

		const multiPaymentContractAddress = await this.#deployMultiPaymentContract();
		await this.#deployMultiPaymentProxy(multiPaymentContractAddress);

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

			usernameContract: getCreateAddress({ from: this.deployerAddress, nonce: 3n }), // PROXY Uses nonce 3
			validatorContract: getCreateAddress({ from: this.deployerAddress, nonce: 1n }), // PROXY Uses nonce 1
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

	async #deployConsensusContract(): Promise<string> {
		// CONSENSUS
		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.from(toBytes(ConsensusAbi.bytecode.object)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(0),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error("failed to deploy Consensus contract");
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: 0n })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(`Deployed Consensus contract from ${this.deployerAddress} to ${receipt.contractAddress}`);

		return receipt.contractAddress!;
	}

	async #deployConsensusProxy(consensusContractAddress: string): Promise<void> {
		const milestone = this.configuration.getMilestone();

		// Encode the initializer call
		const initializerCalldata = encodeFunctionData({
			abi: ConsensusAbi.abi,
			args: [milestone.validatorRegistrationFee],
			functionName: "initialize",
		});

		// Prepare the constructor arguments for the proxy contract
		const deployData = encodeDeployData({
			abi: ERC1967ProxyAbi.abi,
			args: [consensusContractAddress, initializerCalldata],
			bytecode: ERC1967ProxyAbi.bytecode.object as Hex,
		});

		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.from(toBytes(deployData)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(1),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error("failed to deploy Consensus PROXY contract");
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: 1n })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Consensus PROXY contract from ${this.deployerAddress} to ${receipt.contractAddress}`,
		);

		this.#emitContractDeployed({
			activeImplementation: consensusContractAddress,
			address: receipt.contractAddress!,
			implementations: [{ abi: ConsensusAbi.abi, address: consensusContractAddress }],
			name: "consensus",
			proxy: "UUPS",
		});

		this.app.bind(EvmConsensusIdentifiers.Contracts.Addresses.Consensus).toConstantValue(receipt.contractAddress!);
	}

	async #deployUsernamesContract(): Promise<string> {
		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.from(toBytes(UsernamesAbi.bytecode.object)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(2),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error("failed to deploy Usernames contract");
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: 2n })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(`Deployed Usernames contract from ${this.deployerAddress} to ${receipt.contractAddress}`);

		return receipt.contractAddress!;
	}

	async #deployUsernamesProxy(usernamesContractAddress: string): Promise<void> {
		// Encode the initializer call
		const initializerCalldata = encodeFunctionData({
			abi: UsernamesAbi.abi,
			args: undefined,
			functionName: "initialize",
		});

		// Prepare the constructor arguments for the proxy contract
		const deployData = encodeDeployData({
			abi: ERC1967ProxyAbi.abi,
			args: [usernamesContractAddress, initializerCalldata],
			bytecode: ERC1967ProxyAbi.bytecode.object as Hex,
		});

		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.from(toBytes(deployData)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(3),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error("failed to deploy Usernames PROXY contract");
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: 3n })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Usernames PROXY contract from ${this.deployerAddress} to ${receipt.contractAddress}`,
		);

		this.#emitContractDeployed({
			activeImplementation: usernamesContractAddress,
			address: receipt.contractAddress!,
			implementations: [{ abi: UsernamesAbi.abi, address: usernamesContractAddress }],
			name: "usernames",
			proxy: "UUPS",
		});

		this.app.bind(EvmConsensusIdentifiers.Contracts.Addresses.Usernames).toConstantValue(receipt.contractAddress!);
	}

	async #deployMultiPaymentContract(): Promise<string> {
		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.concat([Buffer.from(toBytes(MultiPaymentAbi.bytecode.object))]),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(4),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error("failed to deploy MultiPayment contract");
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: 4n })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(`Deployed MultiPayment contract from ${this.deployerAddress} to ${receipt.contractAddress}`);

		return receipt.contractAddress!;
	}

	async #deployMultiPaymentProxy(multiPaymentAddress: string): Promise<void> {
		// Encode the initializer call
		const initializerCalldata = encodeFunctionData({
			abi: MultiPaymentAbi.abi,
			args: undefined,
			functionName: "initialize",
		});

		// Prepare the constructor arguments for the proxy contract
		const deployData = encodeDeployData({
			abi: ERC1967ProxyAbi.abi,
			args: [multiPaymentAddress, initializerCalldata],
			bytecode: ERC1967ProxyAbi.bytecode.object as Hex,
		});

		const receipt = await this.#processTransaction({
			commitKey: this.#genesisBlockContext.commitKey,
			data: Buffer.from(toBytes(deployData)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(5),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error("failed to deploy MultiPayment PROXY contract");
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: 5n })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed MultiPayment PROXY contract from ${this.deployerAddress} to ${receipt.contractAddress}`,
		);

		this.#emitContractDeployed({
			activeImplementation: multiPaymentAddress,
			address: receipt.contractAddress!,
			implementations: [{ abi: MultiPaymentAbi.abi, address: multiPaymentAddress }],
			name: "multi-payments",
			proxy: "UUPS",
		});

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment)
			.toConstantValue(receipt.contractAddress!);
	}

	public getDeploymentEvents(): Contracts.Evm.DeployerContract[] {
		return this.#deploymentEvents;
	}

	#deploymentEvents: Contracts.Evm.DeployerContract[] = [];
	#emitContractDeployed(event: Contracts.Evm.DeployerContract): void {
		this.#deploymentEvents.push(event);
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
