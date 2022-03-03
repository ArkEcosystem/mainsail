import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class Utils implements Crypto.ITransactionUtils {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer: Crypto.ITransactionSerializer;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async toBytes(data: Crypto.ITransactionData): Promise<Buffer> {
		return this.serializer.serialize(this.transactionTypeFactory.create(data));
	}

	public async toHash(transaction: Crypto.ITransactionData, options?: Crypto.ISerializeOptions): Promise<Buffer> {
		return this.hashFactory.sha256(await this.serializer.getBytes(transaction, options));
	}

	public async getId(transaction: Crypto.ITransactionData, options: Crypto.ISerializeOptions = {}): Promise<string> {
		return (await this.toHash(transaction, options)).toString("hex");
	}
}
