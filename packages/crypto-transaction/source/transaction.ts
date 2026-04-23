import type { Contracts } from "@mainsail/contracts";

export class Transaction implements Contracts.Crypto.Transaction {
	public readonly hash: string;
	public readonly network: number;
	public readonly from: string;
	public readonly senderPublicKey: string;
	public readonly senderLegacyAddress: string;
	public readonly to?: string;
	public readonly value: bigint;
	public readonly gasPrice: number;
	public readonly gasLimit: number;
	public readonly nonce: bigint;
	public readonly data: string;

	public readonly v: number;
	public readonly r: string;
	public readonly s: string;
	public readonly legacySecondSignature?: string;

	public readonly serialized: Buffer;

	constructor(data: Contracts.Crypto.TransactionData, serialized: Buffer) {
		this.hash = data.hash;
		this.network = data.network;
		this.from = data.from;
		this.senderPublicKey = data.senderPublicKey;
		this.senderLegacyAddress = data.senderLegacyAddress;
		this.to = data.to;
		this.value = data.value;
		this.gasPrice = data.gasPrice;
		this.gasLimit = data.gasLimit;
		this.nonce = data.nonce;
		this.data = data.data;

		this.v = data.v;
		this.r = data.r;
		this.s = data.s;
		this.legacySecondSignature = data.legacySecondSignature;

		this.serialized = serialized;
	}

	toData(): Contracts.Crypto.TransactionData {
		let data: Contracts.Crypto.TransactionData = {
			/* eslint-disable perfectionist/sort-objects */
			hash: this.hash,
			network: this.network,
			from: this.from,
			senderPublicKey: this.senderPublicKey,
			senderLegacyAddress: this.senderLegacyAddress,
			to: this.to,
			value: this.value,
			gasPrice: this.gasPrice,
			gasLimit: this.gasLimit,
			nonce: this.nonce,
			data: this.data,

			v: this.v,
			r: this.r,
			s: this.s,
			/* eslint-enable perfectionist/sort-objects */
		};

		if (this.legacySecondSignature) {
			data = {
				...data,
				legacySecondSignature: this.legacySecondSignature,
			};
		}

		return data;
	}
}
