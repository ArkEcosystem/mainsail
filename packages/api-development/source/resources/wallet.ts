import { Contracts as ApiContracts } from "@mainsail/api-common";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class WalletResource implements ApiContracts.Resource {
	public raw(resource: Contracts.State.Wallet): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public transform(resource: Contracts.State.Wallet): object {
		return this.getWalletResource(resource);
	}

	private getWalletResource(wallet: Contracts.State.Wallet): Object {
		return {
			address: wallet.getAddress(),
			publicKey: wallet.getPublicKey(),
			username: wallet.hasAttribute("username") ? wallet.getAttribute("username") : undefined,
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			balance: wallet.getBalance(),
			nonce: wallet.getNonce(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			attributes: wallet.getAttributes(),
		};
	}
}
