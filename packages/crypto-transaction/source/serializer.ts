import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { ByteArray, Hex, toBytes, toRlp } from "viem";

@injectable()
export class Serializer implements Contracts.Crypto.TransactionSerializer {
	public async serialize(transaction: Contracts.Crypto.TransactionSerializable): Promise<Buffer> {
		// Legacy with EIP-155
		const v = transaction.network * 2 + 35 + transaction.v;

		const fields = [
			toBytesCompat(transaction.nonce.toBigInt()), // nonce - 0
			toBytesCompat(transaction.gasPrice), // gasPrice - 1
			toBytesCompat(transaction.gasLimit), // gasLimit - 2
			toBytes(transaction.to || "0x"), // to - 3
			toBytesCompat(transaction.value.toBigInt()), // value - 4
			toBytes(transaction.data), // data - 5
			toBytesCompat(v), // v - 6
			toBytesCompat(`0x${transaction.r}`), // r - 7
			toBytesCompat(`0x${transaction.s}`), // s - 8
		];

		if (transaction.legacySecondSignature) {
			fields.push(toBytes(`0x${transaction.legacySecondSignature}`)); // legacy second signature - 9
		}

		return Buffer.from(`${toRlp(fields).slice(2)}`, "hex");
	}

	public async serializeUnsigned(transaction: Contracts.Crypto.TransactionUnsignedSerializable): Promise<Buffer> {
		const fields = [
			toBytesCompat(transaction.nonce.toBigInt()), // nonce - 0
			toBytesCompat(transaction.gasPrice), // gasPrice - 1
			toBytesCompat(transaction.gasLimit), // gasLimit - 2
			toBytes(transaction.to || "0x"), // to - 3
			toBytesCompat(transaction.value.toBigInt()), // value - 4
			toBytes(transaction.data), // data - 5
			toBytesCompat(transaction.network), // v - 6
			toBytesCompat(0), // r - 7
			toBytesCompat(0), // s - 8
		];

		return Buffer.from(`${toRlp(fields).slice(2)}`, "hex");
	}
}

// Numbers are encoded as their minimal big‑endian byte form.
export function toBytesCompat(value: Hex | bigint | number): ByteArray {
	if (value === 0n || value === 0 || value === "0x" || value === "0x0" || value === "0x00") {
		return new Uint8Array([]);
	}
	return toBytes(value);
}
