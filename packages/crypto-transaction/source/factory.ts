import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import {
	DuplicateParticipantInMultiSignatureError,
	InvalidTransactionBytesError,
	TransactionSchemaError,
	TransactionVersionError,
} from "@mainsail/exceptions";
import { assert, BigNumber } from "@mainsail/utils";

import { BlockTransaction } from "./block-transaction.js";
import { Transaction } from "./transaction.js";

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
	private readonly signatureSerializer!: Contracts.Crypto.SignatureEcdsa;

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

	public async fromBytes(buff: Buffer, strict: boolean = true): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(buff, strict);
	}

	public async fromJson(json: Contracts.Crypto.TransactionJson): Promise<Contracts.Crypto.Transaction> {
		const transactionData: Contracts.Crypto.TransactionData = {
			...json,
			nonce: BigNumber.make(json.nonce),
			value: BigNumber.make(json.value),
		};

		return this.fromData(transactionData, true);
	}

	public async fromStorage(data: Contracts.Evm.TransactionStorageData): Promise<Contracts.Crypto.BlockTransaction> {
		const transaction: Contracts.Crypto.TransactionData = {
			data: data.data.toString("hex"),
			from: data.from,
			gasLimit: Number(data.gasLimit),
			gasPrice: Number(data.gasPrice),
			hash: data.txHash,
			legacySecondSignature: data.legacySecondSignature,
			network: this.configuration.get<number>("network.chainId"),
			nonce: BigNumber.make(data.nonce),
			r: data.r,
			s: data.s,
			senderLegacyAddress: data.legacyAddress,
			senderPublicKey: data.senderPublicKey,
			to: data.to,
			v: data.v,
			value: BigNumber.make(data.value),
		};

		const serialized = await this.serializer.serialize(transaction);

		return new BlockTransaction(transaction, serialized, {
			blockNumber: data.blockNumber,
			transactionIndex: data.index,
		});
	}

	public async fromData(
		data: Contracts.Crypto.TransactionData,
		strict?: boolean,
	): Promise<Contracts.Crypto.Transaction> {
		const { error } = await this.verifier.verifySchema(data, strict);

		if (error) {
			throw new TransactionSchemaError(error);
		}

		const serialized = await this.serializer.serialize(data);

		return this.fromBytes(serialized, strict);
	}

	public async computeCryptoData(
		data: Contracts.Crypto.TransactionData,
		strict: boolean = true,
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

	async #fromSerialized(serialized: Buffer, strict: boolean = true): Promise<Contracts.Crypto.Transaction> {
		try {
			const { data: transaction } = await this.deserializer.deserialize(serialized);

			const { schemaError } = await this.computeCryptoData(transaction, strict);
			if (schemaError) {
				throw new TransactionSchemaError(schemaError);
			}

			return new Transaction(transaction, serialized);
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
