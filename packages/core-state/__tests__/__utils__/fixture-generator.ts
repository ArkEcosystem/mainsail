import { Services } from "@packages/core-kernel";
import { Wallet } from "@packages/core-state/source/wallets";
import { Identities } from "@packages/crypto";
import { Utils } from "@packages/crypto/source";

import compact from "./compact";
import unique from "./unique";

export class FixtureGenerator {
	private genesisSenders;

	public constructor(private genesisBlock, private attributeSet: Services.Attributes.AttributeSet) {
		this.genesisSenders = unique(compact(genesisBlock.transactions.map((tx) => tx.senderPublicKey)));
	}

	public generateFullWallets(): Wallet[] {
		return this.genesisSenders.map((senderPublicKey) => {
			const address = Identities.Address.fromPublicKey(senderPublicKey);
			const wallet = new Wallet(address, new Services.Attributes.AttributeMap(this.attributeSet));
			wallet.publicKey = `${address}`;
			wallet.setAttribute("delegate.username", `username-${address}`);

			wallet.balance = Utils.BigNumber.make(100);
			wallet.setAttribute("delegate", {
				username: `username-${address}`,
				voteBalance: Utils.BigNumber.make(200),
				forgedRewards: Utils.BigNumber.ZERO,
				forgedFees: Utils.BigNumber.ZERO,
			});
			wallet.setAttribute("vote", `vote-${address}`);
			return wallet;
		});
	}

	public generateVotes(): Wallet[] {
		return this.genesisSenders.map((senderPublicKey) => {
			const address = Identities.Address.fromPublicKey(senderPublicKey);
			const wallet = new Wallet(address, new Services.Attributes.AttributeMap(this.attributeSet));
			wallet.setAttribute("vote", wallet.publicKey);
			return wallet;
		});
	}
}
