import type { Contracts } from "@mainsail/contracts";

interface BlockArguments {
	data: Contracts.Crypto.BlockData;
	serialized: string;
	transactions: Contracts.Crypto.Transaction[];
}

export const sealBlock = ({ data, serialized, transactions }: BlockArguments): Contracts.Crypto.Block => {
	const { transactions: _, ...blockHeader } = data;

	return Object.seal({
		data,
		header: blockHeader,
		serialized,
		transactions: transactions.map((transaction, index) => {
			transaction.data.transactionIndex = index;
			return transaction;
		}),
	});
}


