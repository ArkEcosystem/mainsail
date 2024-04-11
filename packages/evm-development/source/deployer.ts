import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { ethers } from "ethers";

import { ERC20 } from "./contracts.ts/index.js";

@injectable()
export class Deployer {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	#genesisAddress!: string;

	public async deploy(): Promise<void> {
		const genesisBlock = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		Utils.assert.defined(genesisBlock);

		this.#genesisAddress = await this.addressFactory.fromPublicKey(genesisBlock.block.generatorPublicKey);

		const result = await this.evm.transact({
			caller: this.#genesisAddress,
			data: Buffer.from(ethers.getBytes(ERC20.abi.bytecode)),
		});

		if (!result.success) {
			throw new Error("failed to deploy erc20 contract");
		}

		this.logger.info(
			`Deployed ERC20 dummy contract from ${this.#genesisAddress} to ${result.deployedContractAddress}`,
		);

		const recipients = [
			...new Set(genesisBlock.block.transactions.map(({ recipientId }) => recipientId!).filter(Boolean)),
		];
		await this.ensureFunds(result.deployedContractAddress!, recipients);
	}

	private async ensureFunds(erc20ContractAddress: string, recipients: string[]): Promise<void> {
		const iface = new ethers.Interface(ERC20.abi.abi);
		const amount = ethers.parseEther("1000");

		for (const recipient of recipients) {
			const encodedCall = iface.encodeFunctionData("transfer", [recipient, amount]);

			const result = await this.evm.transact({
				caller: this.#genesisAddress,
				data: Buffer.from(ethers.getBytes(encodedCall)),
				recipient: erc20ContractAddress,
			});

			if (!result.success) {
				throw new Error("failed to ensure funds");
			}
		}
	}
}
