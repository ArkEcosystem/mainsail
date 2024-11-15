import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi, ERC1967ProxyAbi } from "@mainsail/evm-contracts";
import { Utils } from "@mainsail/kernel";
import { ethers, sha256 } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

// TODO: extract "evm-deployer" package to manage nonce, etc. when deploying protocol contracts.
// Also see "evm-development" which this code is originally based on.

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

	#deployerAddress = "0x0000000000000000000000000000000000000001";
	#nonce = 0;
	#generateTxHash = () => sha256(Buffer.from(`tx-${this.#deployerAddress}-${this.#nonce++}`, "utf8")).slice(2);

	public async deploy(): Promise<void> {
		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		Utils.assert.defined(genesisBlock);

		const genesisInfo = {
			account: genesisBlock.block.generatorAddress,
			deployerAccount: this.#deployerAddress,
			initialSupply: Utils.BigNumber.make(genesisBlock.block.totalAmount).toBigInt(),
			validatorContract: ethers.getCreateAddress({ from: this.#deployerAddress, nonce: 1 }), // PROXY Uses nonce 1
		};

		await this.evm.initializeGenesis(genesisInfo);

		const milestone = this.configuration.getMilestone(0);

		// Commit Key chosen in a way such that it does not conflict with blocks.
		const commitKey = { height: BigInt(2 ** 32 + 1), round: BigInt(0) };
		const blockContext = {
			commitKey,
			gasLimit: BigInt(milestone.block.maxGasLimit),
			timestamp: BigInt(genesisBlock.block.timestamp),
			validatorAddress: this.#deployerAddress,
		};

		// CONSENSUS
		const consensusResult = await this.evm.process({
			blockContext,
			caller: this.#deployerAddress,
			data: Buffer.concat([Buffer.from(ethers.getBytes(ConsensusAbi.bytecode.object))]),
			gasLimit: BigInt(10_000_000),
			nonce: BigInt(0),
			specId: milestone.evmSpec,
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!consensusResult.receipt.success) {
			throw new Error("failed to deploy Consensus contract");
		}

		if (
			consensusResult.receipt.deployedContractAddress !==
			ethers.getCreateAddress({ from: this.#deployerAddress, nonce: 0 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Consensus contract from ${this.#deployerAddress} to ${consensusResult.receipt.deployedContractAddress}`,
		);

		// Logic contract initializer function ABI
		const logicInterface = new ethers.Interface(ConsensusAbi.abi);
		// Encode the initializer call
		const initializerCalldata = logicInterface.encodeFunctionData("initialize");
		// Prepare the constructor arguments for the proxy contract
		const proxyConstructorArguments = new ethers.AbiCoder()
			.encode(["address", "bytes"], [consensusResult.receipt.deployedContractAddress, initializerCalldata])
			.slice(2);

		const proxyResult = await this.evm.process({
			blockContext,
			caller: this.#deployerAddress,
			data: Buffer.concat([
				Buffer.from(ethers.getBytes(ERC1967ProxyAbi.bytecode.object)),
				Buffer.from(proxyConstructorArguments, "hex"),
			]),
			gasLimit: BigInt(10_000_000),
			nonce: BigInt(1),
			specId: milestone.evmSpec,
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!proxyResult.receipt.success) {
			throw new Error("failed to deploy Consensus PROXY contract");
		}

		if (
			proxyResult.receipt.deployedContractAddress !==
			ethers.getCreateAddress({ from: this.#deployerAddress, nonce: 1 })
		) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(
			`Deployed Consensus PROXY contract from ${this.#deployerAddress} to ${proxyResult.receipt.deployedContractAddress}`,
		);

		this.app.bind(EvmConsensusIdentifiers.Internal.Addresses.Deployer).toConstantValue(this.#deployerAddress);

		this.app
			.bind(EvmConsensusIdentifiers.Contracts.Addresses.Consensus)
			.toConstantValue(proxyResult.receipt.deployedContractAddress!);

		this.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue(genesisInfo);

		await this.evm.onCommit({
			...commitKey,
			getBlock: () => ({ data: { round: BigInt(0) } }),
			setAccountUpdates: () => ({}),
		} as any);
	}
}
