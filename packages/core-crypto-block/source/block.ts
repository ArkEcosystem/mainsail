import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class Block implements Contracts.Crypto.IBlock {
	//  - @TODO this is public but not initialised on creation, either make it private or declare it as undefined
	public serialized: string;
	public data: Contracts.Crypto.IBlockData;
	public transactions: Contracts.Crypto.ITransaction[];

	public async init({
		data,
		transactions,
	}: {
		data: Contracts.Crypto.IBlockData;
		transactions: Contracts.Crypto.ITransaction[];
	}) {
		this.data = data;
		this.transactions = transactions.map((transaction, index) => {
			transaction.data.sequence = index;
			return transaction;
		});

		delete this.data.transactions;

		return this;
	}

	public getHeader(): Contracts.Crypto.IBlockData {
		const header: Contracts.Crypto.IBlockData = Object.assign({}, this.data);

		delete header.transactions;

		return header;
	}
}
