import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { bytesToHex, getAddress, Hex, hexToBigInt } from "viem";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async deserialize(serialized: Buffer): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		const { start, end } = decodeListBounds(serialized);

		if (end !== serialized.byteLength) {
			throw new Error("decoded RLP contains trailing bytes");
		}

		const fields: Hex[] = [];
		let offset = start;
		while (offset < end) {
			if (fields.length > 10) {
				throw new Error("decoded RLP contains too many fields");
			}

			const { hex, next } = decodeItem(serialized, offset);
			fields.push(hex);
			offset = next;
		}

		if (offset !== serialized.byteLength) {
			throw new Error("decoded RLP not exhausted");
		}

		if (fields.length < 9) {
			throw new Error("decoded RLP contains too few fields");
		}

		data.nonce = BigNumber.make(this.#parseNumber(fields[0]));
		data.gasPrice = this.#parseNumber(fields[1]);
		data.gasLimit = this.#parseNumber(fields[2]);

		const recipientAddressRaw = this.#parseAddress(fields[3]);
		data.to = recipientAddressRaw ? getAddress(recipientAddressRaw) : undefined;

		data.value = this.#parseBigNumber(fields[4]);
		data.data = this.#parseData(fields[5]);

		// Signature
		const v = this.#parseNumber(fields[6]);
		const chainId = Math.floor((v - 35) / 2);
		data.network = chainId;

		const normalizedV = v - (chainId * 2 + 35);

		data.v = normalizedV;
		data.r = fields[7].slice(2);
		data.s = fields[8].slice(2);

		// Legacy second signature
		if (fields.length === 10) {
			data.legacySecondSignature = fields[9].slice(2);
		}

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);

		instance.serialized = serialized;

		return instance;
	}

	#parseNumber(value: Hex): number {
		return value === "0x" ? 0 : Number(value);
	}

	#parseBigNumber(value: Hex): BigNumber {
		return value === "0x" ? BigNumber.ZERO : BigNumber.make(hexToBigInt(value));
	}

	#parseAddress(value: Hex): string | undefined {
		return value === "0x" ? undefined : value;
	}

	#parseData(value: Hex): string {
		return value === "0x" ? "" : value;
	}
}

function decodeListBounds(buffer: Uint8Array): { start: number; end: number } {
	if (buffer.byteLength === 0) {
		throw new Error("decode RLP empty buffer");
	}

	const prefix = buffer[0];
	if (prefix >= 0xc0 && prefix <= 0xf7) {
		const len = prefix - 0xc0;
		const start = 1;
		const end = start + len;
		if (end > buffer.length) {
			throw new Error("decode RLP truncated short list");
		}

		return { start, end };
	}

	if (prefix >= 0xf8 && prefix <= 0xff) {
		const lenOfLen = prefix - 0xf7;
		if (1 + lenOfLen > buffer.length) {
			throw new Error("decode RLP truncated length-of-length");
		}

		let len = 0;
		for (let i = 0; i < lenOfLen; i++) {
			const v = buffer[1 + i];
			if (i === 0 && lenOfLen > 1 && v === 0) {
				throw new Error("decode RLP leading zero in length");
			}

			len = (len << 8) | v;
		}
		if (len < 56) {
			throw new Error("decode RLP non-minimal long list");
		}

		const start = 1 + lenOfLen;
		const end = start + len;
		if (end > buffer.length) {
			throw new Error("decode RLP truncated long list");
		}

		return { start, end };
	}

	throw new Error("decode RLP not a list");
}

function decodeItem(buffer: Uint8Array, offset: number): { hex: Hex; next: number } {
	if (offset >= buffer.length) {
		throw new Error("decode RLP oob");
	}

	const p = buffer[offset];

	// single byte
	if (p <= 0x7f) {
		return { hex: bytesToHex(buffer.subarray(offset, offset + 1)), next: offset + 1 };
	}

	// short string
	if (p <= 0xb7) {
		const len = p - 0x80;
		const start = offset + 1,
			end = start + len;
		if (end > buffer.length) {
			throw new Error("decode RLP truncated short str");
		}

		if (len === 1 && buffer[start] < 0x80) {
			throw new Error("decode RLP non-minimal short str");
		}

		return { hex: bytesToHex(buffer.subarray(start, end)), next: end };
	}

	// long string
	if (p <= 0xbf) {
		const lenOfLen = p - 0xb7;
		const { len, next } = readLength(buffer, offset + 1, lenOfLen);
		if (len < 56) {
			throw new Error("decode RLP non-minimal long str");
		}

		const end = next + len;
		if (end > buffer.length) {
			throw new Error("decode RLP truncated long str");
		}

		return { hex: bytesToHex(buffer.subarray(next, end)), next: end };
	}

	// list prefix is not a “field” for legacy tx; caller must have read the top-level list already
	throw new Error("decode RLP list prefix inside item (unexpected for legacy flat fields)");
}

function readLength(buffer: Uint8Array, offset: number, lenOfLen: number) {
	if (lenOfLen < 1 || lenOfLen > 8) {
		throw new Error("decode RLP invalid length-of-length");
	}

	if (offset + lenOfLen > buffer.length) {
		throw new Error("decode RLP truncated length");
	}

	// compute big-endian length; enforce minimal form (no leading zero when lenOfLen > 1)
	let len = 0;
	for (let i = 0; i < lenOfLen; i++) {
		const v = buffer[offset + i];
		if (i === 0 && lenOfLen > 1 && v === 0) {
			throw new Error("decode RLP leading zero in length");
		}
		len = (len << 8) | v;
	}

	return { len, next: offset + lenOfLen };
}
