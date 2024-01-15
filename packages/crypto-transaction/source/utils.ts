import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Utils implements Contracts.Crypto.TransactionUtils {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async toBytes(data: Contracts.Crypto.TransactionData): Promise<Buffer> {
		return this.serializer.serialize(this.transactionTypeFactory.create(data));
	}

	public async toHash(
		transaction: Contracts.Crypto.TransactionData,
		options?: Contracts.Crypto.SerializeOptions,
	): Promise<Buffer> {
		return this.hashFactory.sha256(await this.serializer.getBytes(transaction, options));
	}

	public async getId(transaction: Contracts.Crypto.Transaction): Promise<string> {
		return (await this.hashFactory.sha256(transaction.serialized)).toString("hex");
	}
}
