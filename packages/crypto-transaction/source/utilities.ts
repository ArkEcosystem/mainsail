import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import { keccak256, toBytes, toRlp } from "viem";

import { toBytesCompat } from "./serializer.js";

@injectable()
export class Utils implements Contracts.Crypto.TransactionUtilities {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async toBytes(data: Contracts.Crypto.TransactionData): Promise<Buffer> {
		return this.serializer.serialize(this.transactionTypeFactory.create(data));
	}

	public async toHash(
		transaction: Contracts.Crypto.TransactionData,
		options?: Contracts.Crypto.SerializeOptions,
	): Promise<Buffer> {
		const fields = [
			toBytesCompat(transaction.nonce.toBigInt()),
			toBytesCompat(transaction.gasPrice),
			toBytesCompat(transaction.gasLimit),
			toBytes(transaction.to || "0x"),
			toBytesCompat(transaction.value.toBigInt()),
			toBytes(transaction.data.startsWith("0x") ? transaction.data : `0x${transaction.data}`),
		];

		if (options && !options.excludeSignature) {
			assert.number(transaction.v);
			assert.string(transaction.r);
			assert.string(transaction.s);

			fields.push(
				toBytesCompat(transaction.v + transaction.network * 2 + 35),
				toBytesCompat(`0x${transaction.r}`),
				toBytesCompat(`0x${transaction.s}`),
			);
		} else {
			fields.push(toBytesCompat(transaction.network), toBytesCompat(0), toBytesCompat(0));
		}

		const encoded = toRlp(fields); // remove 0x prefix
		return Buffer.from(keccak256(Buffer.from(`${encoded.slice(2)}`, "hex")).slice(2), "hex");
	}

	public async getHash(transaction: Contracts.Crypto.Transaction): Promise<string> {
		return (await this.toHash(transaction.data, { excludeSignature: false })).toString("hex");
	}
}
