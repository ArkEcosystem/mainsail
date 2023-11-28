import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Utils implements Contracts.Crypto.ITransactionUtils {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.ITransactionSerializer;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory!: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.ITransactionTypeFactory;

	public async toBytes(data: Contracts.Crypto.ITransactionData): Promise<Buffer> {
		return this.serializer.serialize(this.transactionTypeFactory.create(data));
	}

	public async toHash(
		transaction: Contracts.Crypto.ITransactionData,
		options?: Contracts.Crypto.ISerializeOptions,
	): Promise<Buffer> {
		return this.hashFactory.sha256(await this.serializer.getBytes(transaction, options));
	}

	public async getId(
		transaction: Contracts.Crypto.ITransaction,
	): Promise<string> {
		return (await this.hashFactory.sha256(transaction.serialized)).toString("hex");
	}
}
