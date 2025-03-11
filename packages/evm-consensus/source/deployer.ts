import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi, ERC1967ProxyAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { assert, BigNumber } from "@mainsail/utils";
import { ethers, sha256 } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

export interface GenesisBlockInfo {
	readonly timestamp: number;
	readonly totalAmount: string;
	readonly generatorAddress: string;
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
	private readonly deployerAddress!: string;

	#genesisBlockInfo!: GenesisBlockInfo;

	#nonce = 0;
	#generateTxHash = () => sha256(Buffer.from(`tx-${this.deployerAddress}-${this.#nonce++}`, "utf8")).slice(2);

	public async deploy(genesisBlockInfo: GenesisBlockInfo): Promise<void> {
		this.#genesisBlockInfo = genesisBlockInfo;

		await this.#initialize();

		const consensusContractAddress = await this.#deployConsensusContract();
		await this.#deployConsensusProxy(consensusContractAddress);

		const usernamesContractAddress = await this.#deployUsernamesContract();
		await this.#deployUsernamesProxy(usernamesContractAddress);

		const multiPaymentContractAddress = await this.#deployMultiPaymentContract();
		await this.#deployMultiPaymentProxy(multiPaymentContractAddress);

		await this.evm.onCommit({
			...this.#getBlockContext().commitKey,
			getBlock: () => ({ data: { round: BigInt(0) } }),
			setAccountUpdates: () => ({}),
		} as any);
	}

	async #initialize(): Promise<void> {
		assert.defined(this.#genesisBlockInfo);

		const genesisInfo = {
			account: this.#genesisBlockInfo.generatorAddress,
			deployerAccount: this.deployerAddress,
			initialSupply: BigNumber.make(this.#genesisBlockInfo.totalAmount).toBigInt(),

			usernameContract: ethers.getCreateAddress({ from: this.deployerAddress, nonce: 3 }), // PROXY Uses nonce 3
			validatorContract: ethers.getCreateAddress({ from: this.deployerAddress, nonce: 1 }), // PROXY Uses nonce 1
		};

		await this.evm.initializeGenesis(genesisInfo);

		this.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue(genesisInfo);
	}

	#getBlockContext(): Contracts.Evm.BlockContext {
		const milestone = this.configuration.getMilestone();

		// Commit Key chosen in a way such that it does not conflict with blocks.
		return {
			commitKey: { height: BigInt(2 ** 32 + 1), round: BigInt(0) },
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
		const consensusResult = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([Buffer.from(ethers.getBytes(ConsensusAbi.bytecode.object))]),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(0),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!consensusResult.receipt.success) {
			throw new Error("failed to deploy Consensus contract");
		}

		if (
			consensusResult.receipt.deployedContractAddress !==
			ethers.getCreateAddress({ from: this.deployerAddress, nonce: 0 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Consensus contract from ${this.deployerAddress} to ${consensusResult.receipt.deployedContractAddress}`,
		);

		return consensusResult.receipt.deployedContractAddress!;
	}

	async #deployConsensusProxy(consensusContractAddress: string): Promise<void> {
		// Logic contract initializer function ABI
		const logicInterface = new ethers.Interface(ConsensusAbi.abi);
		// Encode the initializer call
		const initializerCalldata = logicInterface.encodeFunctionData("initialize");
		// Prepare the constructor arguments for the proxy contract
		const proxyConstructorArguments = new ethers.AbiCoder()
			.encode(["address", "bytes"], [consensusContractAddress, initializerCalldata])
			.slice(2);

		const proxyResult = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([
				Buffer.from(ethers.getBytes(ERC1967ProxyAbi.bytecode.object)),
				Buffer.from(proxyConstructorArguments, "hex"),
			]),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(1),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!proxyResult.receipt.success) {
			throw new Error("failed to deploy Consensus PROXY contract");
		}

		if (
			proxyResult.receipt.deployedContractAddress !==
			ethers.getCreateAddress({ from: this.deployerAddress, nonce: 1 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Consensus PROXY contract from ${this.deployerAddress} to ${proxyResult.receipt.deployedContractAddress}`,
		);

		this.#emitContractDeployed({
			activeImplementation: consensusContractAddress,
			address: proxyResult.receipt.deployedContractAddress!,
			implementations: [{ abi: ConsensusAbi.abi, address: consensusContractAddress }],
			name: "consensus",
			proxy: "UUPS",
		});

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Consensus)
			.toConstantValue(proxyResult.receipt.deployedContractAddress!);
	}

	async #deployUsernamesContract(): Promise<string> {
		const result = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([Buffer.from(ethers.getBytes(UsernamesAbi.bytecode.object))]),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(2),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!result.receipt.success) {
			throw new Error("failed to deploy Usernames contract");
		}

		if (
			result.receipt.deployedContractAddress !== ethers.getCreateAddress({ from: this.deployerAddress, nonce: 2 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Usernames contract from ${this.deployerAddress} to ${result.receipt.deployedContractAddress}`,
		);

		return result.receipt.deployedContractAddress!;
	}

	async #deployUsernamesProxy(usernamesContractAddress: string): Promise<void> {
		// Logic contract initializer function ABI
		const logicInterface = new ethers.Interface(UsernamesAbi.abi);
		// Encode the initializer call
		const initializerCalldata = logicInterface.encodeFunctionData("initialize");
		// Prepare the constructor arguments for the proxy contract
		const proxyConstructorArguments = new ethers.AbiCoder()
			.encode(["address", "bytes"], [usernamesContractAddress, initializerCalldata])
			.slice(2);

		const proxyResult = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([
				Buffer.from(ethers.getBytes(ERC1967ProxyAbi.bytecode.object)),
				Buffer.from(proxyConstructorArguments, "hex"),
			]),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(3),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!proxyResult.receipt.success) {
			throw new Error("failed to deploy Usernames PROXY contract");
		}

		if (
			proxyResult.receipt.deployedContractAddress !==
			ethers.getCreateAddress({ from: this.deployerAddress, nonce: 3 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Usernames PROXY contract from ${this.deployerAddress} to ${proxyResult.receipt.deployedContractAddress}`,
		);

		this.#emitContractDeployed({
			activeImplementation: usernamesContractAddress,
			address: proxyResult.receipt.deployedContractAddress!,
			implementations: [{ abi: UsernamesAbi.abi, address: usernamesContractAddress }],
			name: "usernames",
			proxy: "UUPS",
		});

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Usernames)
			.toConstantValue(proxyResult.receipt.deployedContractAddress!);
	}

	async #deployMultiPaymentContract(): Promise<string> {
		const result = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([Buffer.from(ethers.getBytes(MultiPaymentAbi.bytecode.object))]),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(4),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!result.receipt.success) {
			throw new Error("failed to deploy MultiPayment contract");
		}

		if (
			result.receipt.deployedContractAddress !== ethers.getCreateAddress({ from: this.deployerAddress, nonce: 4 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed MultiPayment contract from ${this.deployerAddress} to ${result.receipt.deployedContractAddress}`,
		);

		return result.receipt.deployedContractAddress!;
	}

	async #deployMultiPaymentProxy(multiPaymentAddress: string): Promise<void> {
		// Logic contract initializer function ABI
		const logicInterface = new ethers.Interface(MultiPaymentAbi.abi);
		// Encode the initializer call
		const initializerCalldata = logicInterface.encodeFunctionData("initialize");
		// Prepare the constructor arguments for the proxy contract
		const proxyConstructorArguments = new ethers.AbiCoder()
			.encode(["address", "bytes"], [multiPaymentAddress, initializerCalldata])
			.slice(2);

		const proxyResult = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([
				Buffer.from(ethers.getBytes(ERC1967ProxyAbi.bytecode.object)),
				Buffer.from(proxyConstructorArguments, "hex"),
			]),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(5),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!proxyResult.receipt.success) {
			throw new Error("failed to deploy MultiPayment PROXY contract");
		}

		if (
			proxyResult.receipt.deployedContractAddress !==
			ethers.getCreateAddress({ from: this.deployerAddress, nonce: 5 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed MultiPayment PROXY contract from ${this.deployerAddress} to ${proxyResult.receipt.deployedContractAddress}`,
		);

		this.#emitContractDeployed({
			activeImplementation: multiPaymentAddress,
			address: proxyResult.receipt.deployedContractAddress!,
			implementations: [{ abi: MultiPaymentAbi.abi, address: multiPaymentAddress }],
			name: "multi-payments",
			proxy: "UUPS",
		});

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment)
			.toConstantValue(proxyResult.receipt.deployedContractAddress!);
	}

	public getDeploymentEvents(): Contracts.Evm.DeployerContract[] {
		return this.#deploymentEvents;
	}

	#deploymentEvents: Contracts.Evm.DeployerContract[] = [];
	#emitContractDeployed(event: Contracts.Evm.DeployerContract): void {
		this.#deploymentEvents.push(event);
		void this.events.dispatch(Events.DeployerEvent.ContractCreated, event);
	}
}
