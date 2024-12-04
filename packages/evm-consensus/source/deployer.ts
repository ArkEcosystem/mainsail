import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi, ERC1967ProxyAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Utils } from "@mainsail/kernel";
import { ethers, sha256 } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

// TODO: extract "evm-deployer" package to manage nonce, etc. when deploying protocol contracts.

@injectable()
export class Deployer {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(EvmConsensusIdentifiers.Internal.Addresses.Deployer)
	private readonly deployerAddress!: string;

	#nonce = 0;
	#generateTxHash = () => sha256(Buffer.from(`tx-${this.deployerAddress}-${this.#nonce++}`, "utf8")).slice(2);

	public async deploy(): Promise<void> {
		await this.#initialize();

		const consensusContractAddress = await this.#deployConsensusContract();
		await this.#deployConsensusProxy(consensusContractAddress);

		const usernamesContractAddress = await this.#deployUsernamesContract();
		await this.#deployUsernamesProxy(usernamesContractAddress);

		await this.#deployMultiPaymentsContract();

		await this.evm.onCommit({
			...this.#getBlockContext().commitKey,
			getBlock: () => ({ data: { round: BigInt(0) } }),
			setAccountUpdates: () => ({}),
		} as any);
	}

	async #initialize(): Promise<void> {
		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		Utils.assert.defined(genesisBlock);

		const genesisInfo = {
			account: genesisBlock.block.generatorAddress,
			deployerAccount: this.deployerAddress,
			initialSupply: Utils.BigNumber.make(genesisBlock.block.totalAmount).toBigInt(),
			// PROXY Uses nonce 1
			usernameContract: ethers.getCreateAddress({ from: this.deployerAddress, nonce: 3 }),
			validatorContract: ethers.getCreateAddress({ from: this.deployerAddress, nonce: 1 }), // PROXY Uses nonce 3
		};

		await this.evm.initializeGenesis(genesisInfo);

		this.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue(genesisInfo);
	}

	#getBlockContext(): Contracts.Evm.BlockContext {
		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		Utils.assert.defined(genesisBlock);

		const milestone = this.configuration.getMilestone(0);

		// Commit Key chosen in a way such that it does not conflict with blocks.
		return {
			commitKey: { height: BigInt(2 ** 32 + 1), round: BigInt(0) },
			gasLimit: BigInt(milestone.block.maxGasLimit),
			timestamp: BigInt(genesisBlock.block.timestamp),
			validatorAddress: this.deployerAddress,
		};
	}

	#getSpecId(): Contracts.Evm.SpecId {
		const milestone = this.configuration.getMilestone(0);
		return milestone.evmSpec;
	}

	async #deployConsensusContract(): Promise<string> {
		// CONSENSUS
		const consensusResult = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([Buffer.from(ethers.getBytes(ConsensusAbi.bytecode.object))]),
			gasLimit: BigInt(10_000_000),
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

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Usernames)
			.toConstantValue(proxyResult.receipt.deployedContractAddress!);
	}

	async #deployMultiPaymentsContract(): Promise<string> {
		const result = await this.evm.process({
			blockContext: this.#getBlockContext(),
			caller: this.deployerAddress,
			data: Buffer.concat([Buffer.from(ethers.getBytes(MultiPaymentAbi.bytecode.object))]),
			gasLimit: BigInt(10_000_000),
			nonce: BigInt(4),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!result.receipt.success) {
			throw new Error("failed to deploy MultiPayments contract");
		}

		if (
			result.receipt.deployedContractAddress !== ethers.getCreateAddress({ from: this.deployerAddress, nonce: 4 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed MultiPayments contract from ${this.deployerAddress} to ${result.receipt.deployedContractAddress}`,
		);

		return result.receipt.deployedContractAddress!;
	}
}
