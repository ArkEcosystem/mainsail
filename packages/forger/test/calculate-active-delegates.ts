import { Identities } from "@mainsail/crypto";
import { Services } from "@mainsail/kernel";
import { Wallets } from "@mainsail/state";

export const calculateActiveDelegates = (): Wallets.Wallet[] => {
	const activeDelegates = [];
	for (let index = 0; index < 51; index++) {
		const address = `Delegate-Wallet-${index}`;
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
