import { inject, injectable, optional, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { assert, BigNumber } from "@mainsail/utils";

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
	private readonly utils!: Contracts.Crypto.TransactionUtilities;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier!: Contracts.Crypto.TransactionVerifier;


	public async fromHex(hex: string): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer, strict = true): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(buff, strict);
	}

	public async fromJson(json: Contracts.Crypto.TransactionJson): Promise<Contracts.Crypto.Transaction> {
		return this.fromData(Transaction.getData(json));
	}

	public async fromData(
		data: Contracts.Crypto.TransactionData,
		strict?: boolean,
	): Promise<Contracts.Crypto.Transaction> {
		const { value, error } = await this.verifier.verifySchema(data, strict);

		if (error) {
			throw new Exceptions.TransactionSchemaError(error);
		}

		const transaction = this.utils.resolve(value);

		await this.serializer.serialize(transaction);

		return this.fromBytes(transaction.serialized, strict);
	}

	public async computeCryptoData(
		data: Contracts.Crypto.TransactionData,
		strict = true,
	): Promise<Contracts.Crypto.TransactionCryptoData> {
		assert.number(data.v);
		assert.string(data.r);
		assert.string(data.s);

		// Passing via IPC converts BigNumber to '{ value: bigint }'
		if ("value" in data.value) {
			data.value = BigNumber.make(data.value["value"]);
		}

		if ("value" in data.nonce) {
			data.nonce = BigNumber.make(data.nonce["value"]);
		}

		const hash = await this.utils.toHash(data, {
			excludeSignature: true,
		});

		const publicKey = this.signatureSerializer.recoverPublicKey(hash, {
			r: data.r,
			s: data.s,
			v: data.v,
		});

		const address = await this.addressFactory.fromPublicKey(publicKey);

		let legacyAddress: string | undefined;
		if (this.legacyAddressFactory) {
			legacyAddress = await this.legacyAddressFactory.fromPublicKey(publicKey);
		}

		const signedHash = await this.utils.toHash(data, {
			excludeSignature: false,
		});

		// Assign to pass schema check
		data.hash = signedHash.toString("hex");
		data.from = address;
		data.senderPublicKey = publicKey;
		data.senderLegacyAddress = legacyAddress;

		const { error } = await this.verifier.verifySchema(data, strict);

		return {
			address,
			hash: data.hash,
			legacyAddress,
			publicKey,
			schemaError: error,
		};
	}

	async #fromSerialized(serialized: Buffer, strict = true): Promise<Contracts.Crypto.Transaction> {
		try {
			const transaction = await this.deserializer.deserialize(serialized);

			await this.computeCryptoData(transaction.data, strict);

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
