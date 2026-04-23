import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged, optional } from "@mainsail/container";
import {
	DuplicateParticipantInMultiSignatureError,
	InvalidTransactionBytesError,
	TransactionSchemaError,
} from "@mainsail/exceptions";
import { assert } from "@mainsail/utils";

import { BlockTransaction } from "./block-transaction.js";
import { Transaction } from "./transaction.js";

@injectable()
export class TransactionFactory implements Contracts.Crypto.TransactionFactory {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
	private readonly legacyAddressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureSerializer!: Contracts.Crypto.SignatureEcdsa;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer!: Contracts.Crypto.TransactionDeserializer;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.HashFactory)
	private readonly hashFactory!: Contracts.Crypto.TransactionHashFactory;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier!: Contracts.Crypto.TransactionVerifier;

	@optional()
	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	public async fromHex(hex: string): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.Transaction> {
		return this.#fromSerialized(buff);
	}

	public async fromJson(json: Contracts.Crypto.TransactionJson): Promise<Contracts.Crypto.Transaction> {
		const transactionData: Contracts.Crypto.TransactionSerializable = {
			...json,
			nonce: BigInt(json.nonce),
			value: BigInt(json.value),
		};

		return this.fromData(transactionData);
	}

	public async fromStorage(
		transaction: Contracts.Crypto.TransactionStorageDataExtended,
	): Promise<Contracts.Crypto.BlockTransaction> {
		const transactionData: Contracts.Crypto.TransactionData = {
			...transaction,
			data: "0x" + transaction.data.toString("hex"),
			gasLimit: Number(transaction.gasLimit),
			gasPrice: Number(transaction.gasPrice),
			hash: transaction.txHash,
			network: this.configuration.getNetwork().chainId,
			nonce: transaction.nonce,
			senderLegacyAddress:
				transaction.legacyAddress ||
				(await this.legacyAddressFactory.fromPublicKey(transaction.senderPublicKey)), // TODO: Make legacy address mandatory
			value: transaction.value,
		};

		const serialized = await this.serializer.serialize(transactionData);

		return new BlockTransaction(transactionData, serialized, {
			blockHash: transaction.blockHash,
			blockNumber: transaction.blockNumber,
			transactionIndex: transaction.index,
		});
	}

	public async fromData(data: Contracts.Crypto.TransactionSerializable): Promise<Contracts.Crypto.Transaction> {
		const { error } = await this.verifier.verifySchemaSigned(data);

		if (error) {
			throw new TransactionSchemaError(error);
		}

		const serialized = await this.serializer.serialize(data);
		return this.fromBytes(serialized);
	}

	public async computeCryptoData(
		data: Contracts.Crypto.TransactionSerializable,
	): Promise<Contracts.Crypto.TransactionCryptoData> {
		assert.number(data.v);
		assert.string(data.r);
		assert.string(data.s);

		const unsignedHash = await this.hashFactory.toHashUnsigned(data);
		const hash = await this.hashFactory.toHash(data);

		const senderPublicKey = this.signatureSerializer.recoverPublicKey(unsignedHash, {
			r: data.r,
			s: data.s,
			v: data.v,
		});

		return {
			from: await this.addressFactory.fromPublicKey(senderPublicKey),
			hash: hash.toString("hex"),
			senderLegacyAddress: await this.legacyAddressFactory.fromPublicKey(senderPublicKey),
			senderPublicKey,
		};
	}

	async #fromSerialized(serialized: Buffer): Promise<Contracts.Crypto.Transaction> {
		try {
			const { data: transaction } = await this.deserializer.deserialize(serialized);

			const worker = this.workerPool ? await this.workerPool.getWorker() : undefined;
			const cryptoData = worker
				? await worker.transactionFactory("computeCryptoData", transaction)
				: await this.computeCryptoData(transaction);

			const tx = { ...cryptoData, ...transaction };

			const { error } = await this.verifier.verifySchemaStrict(tx);
			if (error) {
				throw new TransactionSchemaError(error);
			}

			return new Transaction(tx, serialized);
		} catch (error) {
			if (error instanceof TransactionSchemaError || error instanceof DuplicateParticipantInMultiSignatureError) {
				throw error;
			}

			throw new InvalidTransactionBytesError(error.message);
		}
	}
}
