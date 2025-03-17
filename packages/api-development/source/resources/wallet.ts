import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class WalletResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.State.Wallet): Record<string, any> {
		return JSON.parse(JSON.stringify(resource));
	}

	public transform(resource: Contracts.State.Wallet): Record<string, any> {
		return this.getWalletResource(resource);
	}

	private getWalletResource(wallet: Contracts.State.Wallet): Record<string, any> {
		return {
			address: wallet.getAddress(),
			// publicKey: wallet.getPublicKey(),
			// username: wallet.hasAttribute("username") ? wallet.getAttribute("username") : undefined,

			balance: wallet.getBalance(),
			nonce: wallet.getNonce(),

			// attributes: wallet.getAttributes(),
		};
	}
}
