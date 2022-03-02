import { BigNumber } from "@arkecosystem/utils";

export interface BlockModel {
	id: string;
	version: number;
	timestamp: number;
	previousBlock: string;
	height: number;
	numberOfTransactions: number;
	totalAmount: BigNumber;
	totalFee: BigNumber;
	reward: BigNumber;
	payloadLength: number;
	payloadHash: string;
	generatorPublicKey: string;
	blockSignature: string;
}

export interface TransactionModel {
	id: string;
	version: number;
	blockId: string;
	blockHeight: number;
	sequence: number;
	timestamp: number;
	nonce: BigNumber;
	senderPublicKey: string;
	recipientId: string;
	type: number;
	typeGroup: number;
	vendorField: string | undefined;
	amount: BigNumber;
	fee: BigNumber;
	serialized: Buffer;
	asset: Record<string, any>;
}
