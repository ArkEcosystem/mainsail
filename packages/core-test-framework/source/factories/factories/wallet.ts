// import { Services } from "@arkecosystem/core-kernel";
// import { Wallets } from "@arkecosystem/core-state";
// import { generateMnemonic } from "bip39";

// import { getWalletAttributeSet } from "../../internal/wallet-attributes";
import { FactoryBuilder } from "../factory-builder";

export const registerWalletFactory = (factory: FactoryBuilder): void => {
	// factory.set("Wallet", ({ options }) => {
	// 	const passphrase: string = options.passphrase || generateMnemonic();
	// 	const wallet: Wallets.Wallet = new Wallets.Wallet(
	// 		this.addressFactory.fromMnemonic(passphrase),
	// 		new Services.Attributes.AttributeMap(getWalletAttributeSet()),
	// 	);
	// 	wallet.setPublicKey(this.publicKeyFactory.fromMnemonic(passphrase));
	// 	return wallet;
	// });
};
