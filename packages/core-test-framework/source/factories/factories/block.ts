// import { ValidatorFactory } from "@arkecosystem/core-forger";

// import secrets from "../../internal/passphrases.json";
// import { Signer } from "../../internal/signer";
import { FactoryBuilder } from "../factory-builder";

const defaultBlockTimestampLookup = (height: number): number => {
	if (height === 1) return 0;

	throw new Error(`Attempted to lookup block with height ${height}, but no lookup implementation was provided`);
};

export const registerBlockFactory = (
	factory: FactoryBuilder,
	blockTimestampLookup = defaultBlockTimestampLookup,
): void => {
	// factory.set("Block", ({ options }) => {
	// 	let previousBlock;
	// 	if (options.getPreviousBlock) {
	// 		previousBlock = options.getPreviousBlock();
	// 	} else {
	// 		previousBlock = options.config?.genesisBlock || this.configuration.get("genesisBlock");
	// 	}
	// 	const { blockTime, reward } = this.configuration.getMilestone(previousBlock.height);
	// 	const transactions = options.transactions || [];
	// 	if (options.transactionsCount) {
	// 		const signer = new Signer(options.config, options.nonce);
	// 		const genesisWallets = previousBlock.transactions
	// 			.map((transaction) => transaction.recipientId)
	// 			.filter((address: string) => !!address);
	// 		for (let i = 0; i < options.transactionsCount; i++) {
	// 			transactions.push(
	// 				signer.makeTransfer({
	// 					amount: (options.amount || 2) + i,
	// 					transferFee: options.fee || 0.1,
	// 					recipient: genesisWallets[Math.floor(Math.random() * genesisWallets.length)],
	// 					passphrase: secrets[0],
	// 				}),
	// 			);
	// 		}
	// 	}
	// 	return ValidatorFactory.fromBIP39(options.passphrase || secrets[0]).forge(transactions, {
	// 		previousBlock,
	// 		timestamp:
	// 			Crypto.Slots.getSlotNumber(blockTimestampLookup, Contracts.Crypto.Slots.getTime()) * options.blockTime ||
	// 			blockTime,
	// 		reward: options.reward || reward,
	// 	})!;
	// });
};
