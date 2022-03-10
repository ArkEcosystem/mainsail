import { Contracts } from "@arkecosystem/core-contracts";

interface BlockArguments {
	data: Contracts.Crypto.IBlockData;
	serialized: string;
	transactions: Contracts.Crypto.ITransaction[];
}

export const sealBlock = ({ data, serialized, transactions }: BlockArguments): Contracts.Crypto.IBlock =>
	Object.seal({
		data,
		header: data,
		serialized,
		transactions: transactions.map((transaction, index) => {
			transaction.data.sequence = index;
			return transaction;
		}),
	});
