import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class TransactionFactory implements Contracts.Crypto.ITransactionFactory {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer: Contracts.Crypto.ITransactionDeserializer;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer: Contracts.Crypto.ITransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils: Contracts.Crypto.ITransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier: Contracts.Crypto.ITransactionVerifier;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async fromHex(hex: string): Promise<Contracts.Crypto.ITransaction> {
		return this.fromSerialized(hex);
	}

	public async fromBytes(
		buff: Buffer,
		strict = true,
		options: Contracts.Crypto.IDeserializeOptions = {},
	): Promise<Contracts.Crypto.ITransaction> {
		return this.fromSerialized(buff.toString("hex"), strict, options);
	}

	/**
	 * Deserializes a transaction from `buffer` with the given `id`. It is faster
	 * than `fromBytes` at the cost of vital safety checks (validation, verification and id calculation).
	 *
	 * NOTE: Only use this internally when it is safe to assume the buffer has already been
	 * verified.
	 */
	public async fromBytesUnsafe(buff: Buffer, id?: string): Promise<Contracts.Crypto.ITransaction> {
		try {
			const options: Contracts.Crypto.IDeserializeOptions | Contracts.Crypto.ISerializeOptions = {
				acceptLegacyVersion: true,
			};
			const transaction: Contracts.Crypto.ITransaction = await this.deserializer.deserialize(buff, options);
			transaction.data.id = id || (await this.utils.getId(transaction.data, options));
			transaction.isVerified = true;

			return transaction;
		} catch (error) {
			throw new Exceptions.InvalidTransactionBytesError(error.message);
		}
	}

	public async fromJson(json: Contracts.Crypto.ITransactionJson): Promise<Contracts.Crypto.ITransaction> {
		const data: Contracts.Crypto.ITransactionData = { ...json } as unknown as Contracts.Crypto.ITransactionData;
		data.amount = BigNumber.make(data.amount);
		data.fee = BigNumber.make(data.fee);

		return this.fromData(data);
	}

	public async fromData(
		data: Contracts.Crypto.ITransactionData,
		strict?: boolean,
		options: Contracts.Crypto.IDeserializeOptions = {},
	): Promise<Contracts.Crypto.ITransaction> {
		const { value, error } = this.verifier.verifySchema(data, strict);

		if (error) {
			throw new Exceptions.TransactionSchemaError(error);
		}

		const transaction: Contracts.Crypto.ITransaction = this.transactionTypeFactory.create(value);

		await this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict, options);
	}

	private async fromSerialized(
		serialized: string,
		strict = true,
		options: Contracts.Crypto.IDeserializeOptions = {},
	): Promise<Contracts.Crypto.ITransaction> {
		try {
			const transaction = await this.deserializer.deserialize(serialized, options);
			transaction.data.id = await this.utils.getId(transaction.data, options);

			const { error } = this.verifier.verifySchema(transaction.data, strict);

			if (error) {
				throw new Exceptions.TransactionSchemaError(error);
			}

			transaction.isVerified = await transaction.verify(options);

			return transaction;
		} catch (error) {
			console.log(error);
			if (
				error instanceof Exceptions.TransactionVersionError ||
				error instanceof Exceptions.TransactionSchemaError ||
				error instanceof Exceptions.DuplicateParticipantInMultiSignatureError
			) {
				throw error;
			}

			throw new Exceptions.InvalidTransactionBytesError(error.message);
		}
	}
}
