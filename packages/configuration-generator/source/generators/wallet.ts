import { injectable } from "@mainsail/container";

import { Wallet } from "../contracts.js";
import { Generator } from "./generator.js";

@injectable()
export class WalletGenerator extends Generator {
	async generate(mnemonic?: string): Promise<Wallet> {
		return this.createWallet(mnemonic);
	}
}
