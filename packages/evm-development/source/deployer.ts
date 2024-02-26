import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Bindings } from "@mainsail/evm";
import { Utils } from "@mainsail/kernel";
import { ethers } from "ethers";

import { ERC20 } from "./contracts.ts";

@injectable()
export class Deployer {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Evm.Instance)
	private readonly evm!: Bindings.Evm;

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

		await this.ensureFunds(result.deployedContractAddress!);
	}

	private async ensureFunds(erc20ContractAddress: string): Promise<void> {
		const secrets = this.app.config("validators.secrets");
		Utils.assert.defined<string[]>(secrets);

		for (const secret of secrets) {
			const address = await this.addressFactory.fromMnemonic(secret);

			const iface = new ethers.Interface(ERC20.abi.abi);
			const encodedCall = iface.encodeFunctionData("transfer", [address, 1]);

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
