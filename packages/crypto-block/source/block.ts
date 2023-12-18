import { Contracts } from "@mainsail/contracts";

interface BlockArguments {
	data: Contracts.Crypto.BlockData;
	serialized: string;
	transactions: Contracts.Crypto.Transaction[];
}

export const sealBlock = ({ data, serialized, transactions }: BlockArguments): Contracts.Crypto.Block =>
	Object.seal({
		data,
		header: data,
		serialized,
		transactions: transactions.map((transaction, index) => {
			transaction.data.sequence = index;
			return transaction;
		}),
	});
