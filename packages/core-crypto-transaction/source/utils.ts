import { Container } from "@arkecosystem/container";
import {
	BINDINGS,
	IHashFactory,
	ISerializeOptions,
	ITransactionData,
	ITransactionUtils,
} from "@arkecosystem/core-crypto-contracts";

import { TransactionTypeFactory } from "./types/factory";

@Container.injectable()
export class Utils implements ITransactionUtils {
	@Container.inject(BINDINGS.Transaction.Serializer)
	private readonly serializer: any;

	@Container.inject(BINDINGS.HashFactory)
	private readonly hashFactory: IHashFactory;

	public toBytes(data: ITransactionData): Buffer {
		return this.serializer.serialize(TransactionTypeFactory.create(data));
	}

	public async toHash(transaction: ITransactionData, options?: ISerializeOptions): Promise<Buffer> {
		return this.hashFactory.sha256(this.serializer.getBytes(transaction, options));
	}

	public async getId(transaction: ITransactionData, options: ISerializeOptions = {}): Promise<string> {
		return (await this.toHash(transaction, options)).toString("hex");
	}
}
