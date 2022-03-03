import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import {
	DuplicateParticipantInMultiSignatureError,
	InvalidTransactionBytesError,
	TransactionSchemaError,
	TransactionVersionError,
} from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class TransactionFactory implements Crypto.ITransactionFactory {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer: Crypto.ITransactionDeserializer;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer: Crypto.ITransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils: Crypto.ITransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier: Crypto.ITransactionVerifier;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async fromHex(hex: string): Promise<Crypto.ITransaction> {
		return this.fromSerialized(hex);
	}

	public async fromBytes(
		buff: Buffer,
		strict = true,
		options: Crypto.IDeserializeOptions = {},
	): Promise<Crypto.ITransaction> {
		return this.fromSerialized(buff.toString("hex"), strict, options);
	}

	/**
	 * Deserializes a transaction from `buffer` with the given `id`. It is faster
	 * than `fromBytes` at the cost of vital safety checks (validation, verification and id calculation).
	 *
	 * NOTE: Only use this internally when it is safe to assume the buffer has already been
	 * verified.
	 */
	public async fromBytesUnsafe(buff: Buffer, id?: string): Promise<Crypto.ITransaction> {
		try {
			const options: Crypto.IDeserializeOptions | Crypto.ISerializeOptions = { acceptLegacyVersion: true };
			const transaction = await this.deserializer.deserialize(buff, options);
			transaction.data.id = id || (await this.utils.getId(transaction.data, options));
			transaction.isVerified = true;

			return transaction;
		} catch (error) {
			throw new InvalidTransactionBytesError(error.message);
		}
	}

	public async fromJson(json: Crypto.ITransactionJson): Promise<Crypto.ITransaction> {
		const data: Crypto.ITransactionData = { ...json } as unknown as Crypto.ITransactionData;
		data.amount = BigNumber.make(data.amount);
		data.fee = BigNumber.make(data.fee);

		return this.fromData(data);
	}

	public async fromData(
		data: Crypto.ITransactionData,
		strict = true,
		options: Crypto.IDeserializeOptions = {},
	): Promise<Crypto.ITransaction> {
		const { value, error } = this.verifier.verifySchema(data, strict);

		if (error) {
			throw new TransactionSchemaError(error);
		}

		const transaction: Crypto.ITransaction = this.transactionTypeFactory.create(value);

		await this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict, options);
	}

	private async fromSerialized(
		serialized: string,
		strict = true,
		options: Crypto.IDeserializeOptions = {},
	): Promise<Crypto.ITransaction> {
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
