import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Bindings } from "@mainsail/evm";
import { ERC20 } from "./contracts.ts";
import { ethers } from "ethers";

@injectable()
export class Deployer {
    @inject(Identifiers.Services.Log.Service)
    private readonly logger!: Contracts.Kernel.Logger;

    @inject(Identifiers.Evm.Instance)
    private readonly evm!: Bindings.Evm;

    public async deploy(): Promise<void> {
        const genesis1 = "0x0000000000000000000000000000000000000001";

        const result = await this.evm.transact({
            data: Buffer.from(ethers.getBytes(ERC20.abi.bytecode)),
            caller: genesis1,
        });

        if (!result.success) {
            throw new Error("failed to deploy erc20 contract");
        }

        this.logger.info(`Deployed ERC20 dummy contract: ${result.deployedContractAddress}`);
    }

}