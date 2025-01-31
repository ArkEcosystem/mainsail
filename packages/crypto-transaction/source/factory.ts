import { inject, injectable, optional, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";

@injectable()
export class TransactionFactory implements Contracts.Crypto.TransactionFactory {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
	@optional()
	private readonly legacyAddressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureSerializer!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer!: Contracts.Crypto.TransactionDeserializer;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils!: Contracts.Crypto.TransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async fromHex(hex: string): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(hex);
	}

	public async fromBytes(buff: Buffer, strict = true): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(buff.toString("hex"), strict);
	}

	public async fromJson(json: Contracts.Crypto.TransactionJson): Promise<Contracts.Crypto.Transaction> {
		return this.fromData(this.transactionTypeFactory.get(0, 0, 0).getData(json));
	}

	public async fromData(
		data: Contracts.Crypto.TransactionData,
		strict?: boolean,
	): Promise<Contracts.Crypto.Transaction> {
		const { value, error } = await this.verifier.verifySchema(data, strict);

		if (error) {
			throw new Exceptions.TransactionSchemaError(error);
		}

		const transaction: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(value);

		await this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict);
	}

	async #fromSerialized(serialized: string, strict = true): Promise<Contracts.Crypto.Transaction> {
		try {
			const transaction = await this.deserializer.deserialize(serialized);

			AppUtils.assert.defined<number>(transaction.data.v);
			AppUtils.assert.defined<string>(transaction.data.r);
			AppUtils.assert.defined<string>(transaction.data.s);

			const hash = await this.utils.toHash(transaction.data, {
				excludeSignature: true,
			});

			transaction.data.senderPublicKey = this.signatureSerializer.recoverPublicKey(hash, {
				r: transaction.data.r,
				s: transaction.data.s,
				v: transaction.data.v,
			});
			transaction.data.senderAddress = await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey);

			if (this.legacyAddressFactory) {
				transaction.data.senderLegacyAddress = await this.legacyAddressFactory.fromPublicKey(
					transaction.data.senderPublicKey,
				);
			}

			transaction.data.id = await this.utils.getId(transaction);

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
