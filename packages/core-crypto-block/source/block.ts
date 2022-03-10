import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class Block implements Contracts.Crypto.IBlock {
	//  - @TODO this is public but not initialised on creation, either make it private or declare it as undefined
	public serialized: string;
	public data: Contracts.Crypto.IBlockData;
	public transactions: Contracts.Crypto.ITransaction[];
	public verification: Contracts.Crypto.IBlockVerification;

	public async init({
		data,
		transactions,
		id,
	}: {
		data: Contracts.Crypto.IBlockData;
		transactions: Contracts.Crypto.ITransaction[];
		id?: string;
	}) {
		this.data = data;

		// fix on real timestamp, this is overloading transaction
		// timestamp with block timestamp for storage only
		// also add sequence to keep database sequence
		this.transactions = transactions.map((transaction, index) => {
			transaction.data.blockId = this.data.id;
			transaction.data.blockHeight = this.data.height;
			transaction.data.sequence = index;
			transaction.timestamp = this.data.timestamp;
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
