import { Services } from "@arkecosystem/core-kernel";
import { Wallets } from "@arkecosystem/core-state";
import { Identities } from "@arkecosystem/crypto";

export const calculateActiveDelegates = (): Wallets.Wallet[] => {
	const activeDelegates = [];
	for (let i = 0; i < 51; i++) {
		const address = `Delegate-Wallet-${i}`;
		const wallet = new Wallets.Wallet(
			address,
			new Services.Attributes.AttributeMap(new Services.Attributes.AttributeSet()),
		);

		wallet.setPublicKey(Identities.PublicKey.fromPassphrase(address));
		// @ts-ignore
		wallet.delegate = { username: `Username: ${address}` };
		// @ts-ignore
		activeDelegates.push(wallet);
	}
	return activeDelegates;
};
