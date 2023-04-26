import { Contracts } from "@arkecosystem/core-contracts";

import { Resource, Resources } from "../types";

@injectable()
export class WalletResource implements Resource {
	public raw(resource: Contracts.State.Wallet): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public transform(resource: Contracts.State.Wallet): object {
		return this.getWalletResource(resource);
	}

	private getWalletResource(wallet: Contracts.State.Wallet): Resources.WalletResource {
		return {
			address: wallet.getAddress(),
			attributes: wallet.getAttributes(),
			balance: wallet.getBalance(),
			nonce: wallet.getNonce(),
			publicKey: wallet.getPublicKey(),
		};
	}
}
