import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IHashFactory,
	ISerializeOptions,
	ITransactionData,
	ITransactionSerializer,
	ITransactionUtils,
} from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";

@Container.injectable()
export class Utils implements ITransactionUtils {
	@Container.inject(BINDINGS.Transaction.Serializer)
	private readonly serializer: ITransactionSerializer;

	@Container.inject(BINDINGS.HashFactory)
	private readonly hashFactory: IHashFactory;

	@Container.inject(BINDINGS.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async toBytes(data: ITransactionData): Promise<Buffer> {
		return this.serializer.serialize(this.transactionTypeFactory.create(data));
	}

	public async toHash(transaction: ITransactionData, options?: ISerializeOptions): Promise<Buffer> {
		return this.hashFactory.sha256(await this.serializer.getBytes(transaction, options));
	}

	public async getId(transaction: ITransactionData, options: ISerializeOptions = {}): Promise<string> {
		return (await this.toHash(transaction, options)).toString("hex");
	}
}
