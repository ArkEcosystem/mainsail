import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { ethers, sha256 } from "ethers";

import { ERC20 } from "./contracts.ts/index.js";
import { Identifiers as EvmDevelopmentIdentifiers } from "./identifiers.js";

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

	#deployerAddress = "0x0000000000000000000000000000000000000002";

	public async deploy(): Promise<void> {
		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		Utils.assert.defined(genesisBlock);

		const milestone = this.configuration.getMilestone(0);

		// Commit Key chosen in a way such that it does not conflict with blocks.
		const commitKey = { height: BigInt(2 ** 32), round: BigInt(0) };
		const blockContext = {
			commitKey,
			gasLimit: BigInt(milestone.block.maxGasLimit),
			timestamp: BigInt(genesisBlock.block.timestamp),
			validatorAddress: this.#deployerAddress,
		};

		const result = await this.evm.process({
			blockContext,
			caller: this.#deployerAddress,
			data: Buffer.from(ethers.getBytes(ERC20.abi.bytecode)),
			gasLimit: BigInt(2_000_000),
			specId: milestone.evmSpec,
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!result.receipt.success) {
			throw new Error("failed to deploy erc20 contract");
		}

		this.logger.info(
			`Deployed ERC20 dummy contract from ${this.#deployerAddress} to ${result.receipt.deployedContractAddress}`,
		);

		const recipients = [
			...new Set(genesisBlock.block.transactions.map(({ recipientId }) => recipientId!).filter(Boolean)),
		];

		this.app.bind(EvmDevelopmentIdentifiers.Wallets.Funded).toConstantValue(recipients);
		this.app
			.bind(EvmDevelopmentIdentifiers.Contracts.Addresses.Erc20)
			.toConstantValue(result.receipt.deployedContractAddress!);

		await this.ensureFunds(result.receipt.deployedContractAddress!, recipients, blockContext);
		await this.evm.onCommit(commitKey as any);
	}

	private async ensureFunds(
		erc20ContractAddress: string,
		recipients: string[],
		blockContext: Contracts.Evm.BlockContext,
	): Promise<void> {
		const iface = new ethers.Interface(ERC20.abi.abi);
		const amount = ethers.parseEther("1000");
		const milestone = this.configuration.getMilestone(0);

		for (const recipient of recipients) {
			const encodedCall = iface.encodeFunctionData("transfer", [recipient, amount]);

			const { receipt } = await this.evm.process({
				blockContext,
				caller: this.#deployerAddress,
				data: Buffer.from(ethers.getBytes(encodedCall)),
				gasLimit: BigInt(100_000),
				recipient: erc20ContractAddress,
				specId: milestone.evmSpec,
				txHash: this.#generateTxHash(),
				value: 0n,
			});

			if (!receipt.success) {
				throw new Error("failed to ensure funds");
			}
		}
	}

	#nonce = 0;
	#generateTxHash = () => sha256(Buffer.from(`tx-${this.#deployerAddress}-${this.#nonce++}`, "utf8")).slice(2);
}
