import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class TransactionFactory implements Contracts.Crypto.ITransactionFactory {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer!: Contracts.Crypto.ITransactionDeserializer;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.ITransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils!: Contracts.Crypto.ITransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier!: Contracts.Crypto.ITransactionVerifier;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.ITransactionTypeFactory;

	public async fromHex(hex: string): Promise<Contracts.Crypto.ITransaction> {
		return this.#fromSerialized(hex);
	}

	public async fromBytes(buff: Buffer, strict = true): Promise<Contracts.Crypto.ITransaction> {
		return this.#fromSerialized(buff.toString("hex"), strict);
	}

	public async fromJson(json: Contracts.Crypto.ITransactionJson): Promise<Contracts.Crypto.ITransaction> {
		return this.fromData(this.transactionTypeFactory.get(json.type, json.typeGroup, json.version).getData(json));
	}

	public async fromData(
		data: Contracts.Crypto.ITransactionData,
		strict?: boolean,
	): Promise<Contracts.Crypto.ITransaction> {
		const { value, error } = await this.verifier.verifySchema(data, strict);

		if (error) {
			throw new Exceptions.TransactionSchemaError(error);
		}

		const transaction: Contracts.Crypto.ITransaction = this.transactionTypeFactory.create(value);

		await this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict);
	}

	async #fromSerialized(serialized: string, strict = true): Promise<Contracts.Crypto.ITransaction> {
		try {
			const transaction = await this.deserializer.deserialize(serialized);
			transaction.data.id = await this.utils.getIdFromHex(serialized);

			const { error } = await this.verifier.verifySchema(transaction.data, strict);

			if (error) {
				throw new Exceptions.TransactionSchemaError(error);
			}

			return transaction;
		} catch (error) {
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
