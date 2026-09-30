import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { hexToBytes, toBytes, toRlp } from "viem";

import { TransactionBuilder } from "../../source/builder.js";
import { wallet } from "../fixtures/index.js";

export const signTransfer = async (app: Application, nonce = 0): Promise<Contracts.Crypto.TransactionData> => {
	const builder = app.resolve(TransactionBuilder);
	builder.recipientAddress(wallet.address);
	builder.nonce(String(nonce));

	await builder.signWithKeyPair({
		compressed: false,
		privateKey: wallet.privateKey,
		publicKey: wallet.publicKey,
	});

	return builder.getStruct();
};

// Standard Ethereum wallets RLP-encode r/s as minimal integers, stripping leading zero bytes.
// Sign transfers with increasing nonces until one has a leading zero byte in r or s
// (~1 in 128 signatures), so the minimal-RLP encoding is strictly shorter than 32 bytes.
// Signatures are deterministic (RFC 6979), so the same nonce is found on every run.
export const signUntilLeadingZeroRS = async (app: Application): Promise<Contracts.Crypto.TransactionData> => {
	for (let nonce = 0; nonce < 5000; nonce++) {
		const struct = await signTransfer(app, nonce);
		if (struct.r.startsWith("00") || struct.s.startsWith("00")) {
			return struct;
		}
	}

	throw new Error("could not find a signature with a leading-zero r/s byte");
};

// Minimal big-endian encoding of an integer (canonical RLP form): zero is the empty string.
const minimalInteger = (value: bigint): Uint8Array => (value === 0n ? new Uint8Array() : toBytes(value));

// The ordered legacy RLP fields (nonce, gasPrice, gasLimit, to, value, data, v, r, s) for a signed
// struct, each in canonical minimal-integer form — byte-identical to what the serializer emits.
// Tests overwrite a single entry with a non-canonical value, then RLP-encode with `encodeLegacy`,
// to exercise the deserializer's decode-time guards without going through the (canonicalizing) serializer.
export const legacyRlpFields = (transaction: Contracts.Crypto.TransactionData): Uint8Array[] => {
	const eip155V = BigInt(transaction.network) * 2n + 35n + BigInt(transaction.v);

	return [
		minimalInteger(BigInt(transaction.nonce)),
		minimalInteger(BigInt(transaction.gasPrice)),
		minimalInteger(BigInt(transaction.gasLimit)),
		transaction.to ? hexToBytes(transaction.to as `0x${string}`) : new Uint8Array(),
		minimalInteger(BigInt(transaction.value)),
		hexToBytes(transaction.data as `0x${string}`),
		minimalInteger(eip155V),
		minimalInteger(BigInt(`0x${transaction.r}`)),
		minimalInteger(BigInt(`0x${transaction.s}`)),
	];
};

export const encodeLegacy = (fields: Uint8Array[]): Buffer => Buffer.from(toRlp(fields).slice(2), "hex");

// A 32-byte big-endian buffer for a hex string, preserving leading zero bytes (unlike minimalInteger).
export const fixedWidth32 = (hex: string): Uint8Array => hexToBytes(`0x${hex.padStart(64, "0")}`);
