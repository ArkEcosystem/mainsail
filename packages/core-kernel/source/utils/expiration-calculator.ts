import { Crypto } from "@arkecosystem/core-contracts";

export const calculateTransactionExpiration = (
	transaction: Crypto.ITransactionData,
	context: {
		blockTime: number;
		currentHeight: number;
		now: number;
		maxTransactionAge: number;
	},
): number | undefined => {
	// We ignore transaction.expiration in v1 transactions because it is not signed
	// by the transaction creator.
	// TODO: check if ok
	if (transaction.version && transaction.version >= 2) {
		return transaction.expiration || undefined;
	}

	// Since the user did not specify an expiration we set one by calculating
	// approximately the height of the chain as of the time the transaction was
	// created and adding maxTransactionAge to that.

	// Both now and transaction.timestamp use [number of seconds since the genesis block].
	const createdSecondsAgo: number = context.now - transaction.timestamp;

	const createdBlocksAgo: number = Math.floor(createdSecondsAgo / context.blockTime);

	const createdAtHeight: number = context.currentHeight - createdBlocksAgo;

	return createdAtHeight + context.maxTransactionAge;
};
