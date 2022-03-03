// import { Wallets } from "@arkecosystem/core-state";
// import { BigNumber } from "@arkecosystem/utils";

// import passphrases from "../../internal/passphrases.json";
// import { knownAttributes } from "../../internal/wallet-attributes";
import { FactoryBuilder } from "../factory-builder";

export const registerRoundFactory = (factory: FactoryBuilder): void => {
	// factory.set("Round", ({ options }) => {
	// 	const publicKeys: string[] =
	// 		options.publicKeys ||
	// 		passphrases.map((passphrase: string) => this.publicKeyFactory.fromMnemonic(passphrase));
	// 	return publicKeys.map((publicKey: string, index: number) => {
	// 		const wallet = new Wallets.Wallet(this.addressFactory.fromPublicKey(publicKey), knownAttributes);
	// 		wallet.setPublicKey(publicKey);
	// 		wallet.setAttribute("validator", {
	// 			forgedFees: BigNumber.ZERO,
	// 			forgedRewards: BigNumber.ZERO,
	// 			producedBlocks: 0,
	// 			rank: undefined,
	// 			round: options.round || 1,
	// 			username: `genesis_${index + 1}`,
	// 			voteBalance: BigNumber.make("300000000000000"),
	// 		});
	// 		return wallet;
	// 	});
	// });
};
