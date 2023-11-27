import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	allowedSenders: [],

	enabled: !Environment.isTrue(Constants.Flags.CORE_TRANSACTION_POOL_DISABLED),

	// Max transaction age in number of blocks produced since the transaction was created.
	// If a transaction stays that long in the pool without being included in any block,
	// then it will be removed.
	maxTransactionAge: 2700,

	maxTransactionBytes: 2_000_000, // TODO think of a value that makes sense ?

	// When the pool contains that many transactions, then a new transaction is
	// only accepted if its fee is higher than the transaction with the lowest
	// fee in the pool. In this case the transaction with the lowest fee is removed
	// from the pool in order to accommodate the new one.
	maxTransactionsInPool: Environment.get(Constants.Flags.CORE_MAX_TRANSACTIONS_IN_POOL, 15_000),
	maxTransactionsPerRequest: Environment.get(Constants.Flags.CORE_TRANSACTION_POOL_MAX_PER_REQUEST, 40),
	maxTransactionsPerSender: Environment.get(Constants.Flags.CORE_TRANSACTION_POOL_MAX_PER_SENDER, 150),

	storage: `${Environment.get(Constants.Flags.CORE_PATH_DATA)}/mainsail/transaction-pool.sqlite`,
};
