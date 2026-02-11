import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import type { BigNumber } from "@mainsail/utils";

@injectable()
export class Transaction implements Contracts.Crypto.Transaction {
	public readonly hash: string;
	public readonly network: number;
	public readonly from: string;
	public readonly senderPublicKey: string;
	public readonly to?: string;
	public readonly value: BigNumber;
	public readonly gasPrice: number;
	public readonly gasLimit: number;
	public readonly nonce: BigNumber;
	public readonly data: string;

	public readonly v: number;
	public readonly r: string;
	public readonly s: string;
	public readonly legacySecondSignature?: string;

	public readonly transactionIndex?: number;
	public readonly gasUsed?: number;
	public readonly blockHash?: string;
	public readonly blockNumber?: number;

	public serialized: Buffer;

	constructor(data: Contracts.Crypto.TransactionData, serialized: Buffer) {
		this.hash = data.hash;
		this.network = data.network;
		this.from = data.from;
		this.senderPublicKey = data.senderPublicKey;
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

		// this.transactionIndex = data.transactionIndex;
		// this.gasUsed = data.gasUsed;
		// this.blockHash = data.blockHash;
		// this.blockNumber = data.blockNumber;

		this.serialized = serialized;
	}

	toData(): Contracts.Crypto.TransactionData {
		return {
			/* eslint-disable sort-keys-fix/sort-keys-fix */
			hash: this.hash,
			network: this.network,
			from: this.from,
			senderPublicKey: this.senderPublicKey,
			to: this.to,
			value: this.value,
			gasPrice: this.gasPrice,
			gasLimit: this.gasLimit,
			nonce: this.nonce,
			data: this.data,

			v: this.v,
			r: this.r,
			s: this.s,
			legacySecondSignature: this.legacySecondSignature,

			// transactionIndex: this.transactionIndex,
			// gasUsed: this.gasUsed,
			// blockHash: this.blockHash,
			// blockNumber: this.blockNumber,
			/* eslint-enable sort-keys-fix/sort-keys-fix */
		};
	}
}
