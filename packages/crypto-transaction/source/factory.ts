import {
	DuplicateParticipantInMultiSignatureError,
	InvalidTransactionBytesError,
	TransactionSchemaError,
	TransactionVersionError,
} from "./errors";
import {
	IDeserializeOptions,
	ISerializeOptions,
	ITransaction,
	ITransactionData,
	ITransactionJson,
} from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";
import { TransactionTypeFactory } from "./types";
import { Utils } from "./utils";
import { Verifier } from "./verifier";
import { Container } from "@arkecosystem/container";
import { BINDINGS } from "@arkecosystem/crypto-contracts";
import { Configuration } from "@arkecosystem/crypto-config";

@Container.injectable()
export class TransactionFactory {
	@Container.inject(BINDINGS.Configuration)
	protected readonly configuration: Configuration;

	@Container.inject(BINDINGS.Transaction.Deserializer)
	private readonly deserializer: Deserializer;

	@Container.inject(BINDINGS.Transaction.Serializer)
	private readonly serializer: Serializer;

	@Container.inject(BINDINGS.Transaction.Utils)
	private readonly utils: Utils;

	@Container.inject(BINDINGS.Transaction.Verifier)
	private readonly verifier: Verifier;

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
			const transaction = this.deserializer.deserialize(buff, options);
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

		const transaction: ITransaction = TransactionTypeFactory.create(value);

		const { version } = transaction.data;
		if (version === 1) {
			this.deserializer.applyV1Compatibility(transaction.data);
		}

		this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict, options);
	}

	private async fromSerialized(
		serialized: string,
		strict = true,
		options: IDeserializeOptions = {},
	): Promise<ITransaction> {
		try {
			const transaction = this.deserializer.deserialize(serialized, options);
			transaction.data.id = await this.utils.getId(transaction.data, options);

			const { error } = this.verifier.verifySchema(transaction.data, strict);

			if (error) {
				throw new TransactionSchemaError(error);
			}

			transaction.isVerified = await transaction.verify(options);

			return transaction;
		} catch (error) {
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
