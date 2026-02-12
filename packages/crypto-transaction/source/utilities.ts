import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import { Keccak256 } from "bcrypto";
import { ByteArray, toBytes, toRlp } from "viem";

import { toBytesCompat } from "./serializer.js";

@injectable()
export class Utils implements Contracts.Crypto.TransactionUtilities {
	public async toHashUnsigned(transaction: Contracts.Crypto.TransactionUnsignedSerializable): Promise<Buffer> {
		const fields = [
			...this.#getBaseFields(transaction),
			toBytesCompat(transaction.network),
			toBytesCompat(0),
			toBytesCompat(0),
		];

		const encoded = toRlp(fields); // remove 0x prefix
		return Buffer.from(Keccak256.digest(Buffer.from(`${encoded.slice(2)}`, "hex")));
	}

	public async toHash(transaction: Contracts.Crypto.TransactionSerializable): Promise<Buffer> {
		assert.number(transaction.v);
		assert.string(transaction.r);
		assert.string(transaction.s);

		const fields = [
			...this.#getBaseFields(transaction),
			toBytesCompat(transaction.v + transaction.network * 2 + 35),
			toBytesCompat(`0x${transaction.r}`),
			toBytesCompat(`0x${transaction.s}`),
		];

		const encoded = toRlp(fields); // remove 0x prefix
		return Buffer.from(Keccak256.digest(Buffer.from(`${encoded.slice(2)}`, "hex")));
	}

	#getBaseFields(transaction: Contracts.Crypto.TransactionUnsignedSerializable): ByteArray[] {
		return [
			toBytesCompat(transaction.nonce.toBigInt()),
			toBytesCompat(transaction.gasPrice),
			toBytesCompat(transaction.gasLimit),
			toBytes(transaction.to || "0x"),
			toBytesCompat(transaction.value.toBigInt()),
			toBytes(transaction.data.startsWith("0x") ? transaction.data : `0x${transaction.data}`),
		];
	}
}
