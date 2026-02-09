import type { Contracts } from "@mainsail/contracts";

interface BlockArguments {
	data: Contracts.Crypto.BlockHeader;
	serialized: string;
	transactions: Contracts.Crypto.Transaction[];
}

export const sealBlock = ({ data, serialized, transactions }: BlockArguments): Contracts.Crypto.Block =>
	Object.seal({
		...data,
		serialized,
		transactions: transactions.map((transaction, index) => {
			transaction.data.transactionIndex = index;
			return transaction;
		}),
	});
