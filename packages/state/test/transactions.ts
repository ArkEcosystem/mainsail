import { Contracts } from "@mainsail/contracts";

export const addTransactionsToBlock = (txs: Contracts.Crypto.Transaction[], block: Contracts.Crypto.Block) => {
	const { data } = block;
	data.transactions = [];
	txs.forEach((tx) => data.transactions?.push(tx.data));
	data.transactions.push(txs[0].data);
	data.transactions.push(txs[1].data);
	data.transactions.push(txs[2].data);
	data.numberOfTransactions = txs.length; // NOTE: if transactions are added to a fixture the NoT needs to be increased
	block.transactions = txs;
};
