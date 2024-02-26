import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { Bindings } from "@mainsail/evm";
import { ERC20 } from "./contracts.ts";
import { ethers } from "ethers";

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

    #genesis1 = "0x0000000000000000000000000000000000000001";

    public async deploy(): Promise<void> {

        const result = await this.evm.transact({
            data: Buffer.from(ethers.getBytes(ERC20.abi.bytecode)),
            caller: this.#genesis1,
        });

        if (!result.success) {
            throw new Error("failed to deploy erc20 contract");
        }

        this.logger.info(`Deployed ERC20 dummy contract: ${result.deployedContractAddress}`);

        await this.ensureFunds(
            result.deployedContractAddress!
        );
    }

    private async ensureFunds(erc20ContractAddress: string): Promise<void> {
        const secrets = this.app.config("validators.secrets");
        Utils.assert.defined<string[]>(secrets);

        for (const secret of secrets) {
            const address = await this.addressFactory.fromMnemonic(secret);

            const iface = new ethers.Interface(ERC20.abi.abi);
            const encodedCall = iface.encodeFunctionData("transfer", [address, 1]);

            const result = await this.evm.transact({
                caller: this.#genesis1,
                recipient: erc20ContractAddress,
                data: Buffer.from(ethers.getBytes(encodedCall)),
            });

            if (!result.success) {
                throw new Error("failed to ensure funds");
            }
        }
    }
}