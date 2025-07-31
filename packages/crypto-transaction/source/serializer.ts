import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Hex, toBytes, toRlp } from "viem";

@injectable()
export class Serializer implements Contracts.Crypto.TransactionSerializer {
	public async serialize(
		transaction: Contracts.Crypto.Transaction,
		options: Contracts.Crypto.SerializeOptions = {},
	): Promise<Buffer> {
		const fields = [
			toBytesCompat(transaction.data.nonce.toBigInt()), // nonce - 0
			toBytesCompat(transaction.data.gasPrice), // maxFeePerGas - 1
			toBytesCompat(transaction.data.gasLimit), // gasLimit - 2
			toBytes(transaction.data.to || "0x"), // to - 3
			toBytesCompat(transaction.data.value.toBigInt()), // value - 4
			toBytes(transaction.data.data.startsWith("0x") ? transaction.data.data : `0x${transaction.data.data}`), // data - 5
			toBytesCompat(transaction.data.network), // v - 6
			toBytesCompat(0), // r - 7
			toBytesCompat(0), // s - 8
		];

		if (transaction.data.v !== undefined && transaction.data.r && transaction.data.s && !options.excludeSignature) {
			// Legacy with EIP-155
			const normalizedV = transaction.data.v;
			const v = transaction.data.network * 2 + 35 + normalizedV;

			// 6, 7, 8
			fields[6] = toBytesCompat(v);
			fields[7] = toBytesCompat(`0x${transaction.data.r}`);
			fields[8] = toBytesCompat(`0x${transaction.data.s}`);

			if (transaction.data.legacySecondSignature) {
				// 9
				fields.push(toBytes(`0x${transaction.data.legacySecondSignature}`));
			}
		}

		const rlpEncoded = toRlp(fields);
		transaction.serialized = Buffer.from(`${rlpEncoded.slice(2)}`, "hex");

		return transaction.serialized;
	}
}

// Numbers are encoded as their minimal big‑endian byte form.
export function toBytesCompat(value: Hex | bigint | number) {
	if (value === 0n || value === 0 || value === "0x" || value === "0x0" || value === "0x00") {
		return new Uint8Array([]);
	}
	return toBytes(value);
}
