import { injectable } from "@arkecosystem/core-container";

import { Wallet } from "../contracts";
import { Generator } from "./generator";

@injectable()
export class WalletGenerator extends Generator {
	async generate(mnemonic?: string): Promise<Wallet> {
		return this.createWallet(mnemonic);
	}
}
