import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IConfiguration,
	IDeserializeOptions,
	ISerializeOptions,
	ITransaction,
	ITransactionData,
	ITransactionDeserializer,
	ITransactionFactory,
	ITransactionJson,
	ITransactionSerializer,
	ITransactionUtils,
	ITransactionVerifier,
} from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import {
	DuplicateParticipantInMultiSignatureError,
	InvalidTransactionBytesError,
	TransactionSchemaError,
	TransactionVersionError,
} from "./errors";

@Container.injectable()
export class TransactionFactory implements ITransactionFactory {
	@Container.inject(BINDINGS.Configuration)
	protected readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Transaction.Deserializer)
	private readonly deserializer: ITransactionDeserializer;

	@Container.inject(BINDINGS.Transaction.Serializer)
	private readonly serializer: ITransactionSerializer;

	@Container.inject(BINDINGS.Transaction.Utils)
	private readonly utils: ITransactionUtils;

	@Container.inject(BINDINGS.Transaction.Verifier)
	private readonly verifier: ITransactionVerifier;

	@Container.inject(BINDINGS.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async fromHex(hex: string): Promise<ITransaction> {
		return this.fromSerialized(hex);
	}

	public async fromBytes(buff: Buffer, strict = true, options: IDeserializeOptions = {}): Promise<ITransaction> {
		return this.fromSerialized(buff.toString("hex"), strict, options);
	}

	/**
	 * Deserializes a transaction from `buffer` with the given `id`. It is faster
	 * than `fromBytes` at the cost of vital safety checks (validation, verification and id calculation).
	 *
	 * NOTE: Only use this internally when it is safe to assume the buffer has already been
	 * verified.
	 */
	public async fromBytesUnsafe(buff: Buffer, id?: string): Promise<ITransaction> {
		try {
			const options: IDeserializeOptions | ISerializeOptions = { acceptLegacyVersion: true };
			const transaction = await this.deserializer.deserialize(buff, options);
			transaction.data.id = id || (await this.utils.getId(transaction.data, options));
			transaction.isVerified = true;

			return transaction;
		} catch (error) {
			throw new InvalidTransactionBytesError(error.message);
		}
	}

	public async fromJson(json: ITransactionJson): Promise<ITransaction> {
		const data: ITransactionData = { ...json } as unknown as ITransactionData;
		data.amount = BigNumber.make(data.amount);
		data.fee = BigNumber.make(data.fee);

		return this.fromData(data);
	}

	public async fromData(
		data: ITransactionData,
		strict = true,
		options: IDeserializeOptions = {},
	): Promise<ITransaction> {
		const { value, error } = this.verifier.verifySchema(data, strict);

		if (error) {
			throw new TransactionSchemaError(error);
		}

		const transaction: ITransaction = this.transactionTypeFactory.create(value);

		await this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict, options);
	}

	private async fromSerialized(
		serialized: string,
		strict = true,
		options: IDeserializeOptions = {},
	): Promise<ITransaction> {
		try {
			const transaction = await this.deserializer.deserialize(serialized, options);
			transaction.data.id = await this.utils.getId(transaction.data, options);

			const { error } = this.verifier.verifySchema(transaction.data, strict);

			if (error) {
				throw new TransactionSchemaError(error);
			}

			transaction.isVerified = await transaction.verify(options);

			return transaction;
		} catch (error) {
			console.log(error);
			if (
				error instanceof TransactionVersionError ||
				error instanceof TransactionSchemaError ||
				error instanceof DuplicateParticipantInMultiSignatureError
			) {
				throw error;
			}

			throw new InvalidTransactionBytesError(error.message);
		}
	}
}
