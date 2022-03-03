import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { blocks } from "./proto/protos";

const hardLimitNumberOfBlocks = 400;
const hardLimitNumberOfTransactions = 500;

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): blocks.IGetBlocksRequest => blocks.GetBlocksRequest.decode(payload),
		serialize: (object: blocks.IGetBlocksRequest): Buffer =>
			Buffer.from(blocks.GetBlocksRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer) => {
			const blocksBuffer = Buffer.from(payload);
			const blocksBuffers: Buffer[] = [];
			for (let offset = 0; offset < blocksBuffer.byteLength - 4; ) {
				const blockLength = blocksBuffer.readUInt32BE(offset);
				blocksBuffers.push(blocksBuffer.slice(offset + 4, offset + 4 + blockLength));
				offset += 4 + blockLength;
				if (blocksBuffers.length > hardLimitNumberOfBlocks) {
					break;
				}
			}

			return blocksBuffers.map((blockBuffer) => {
				const blockWithTxBuffer = blocks.GetBlocksResponse.BlockHeader.decode(blockBuffer);
				const txsBuffer = Buffer.from(blockWithTxBuffer.transactions);
				const txs: string[] = [];
				for (let offset = 0; offset < txsBuffer.byteLength - 4; ) {
					const txLength = txsBuffer.readUInt32BE(offset);
					txs.push(txsBuffer.slice(offset + 4, offset + 4 + txLength).toString("hex"));
					offset += 4 + txLength;
					if (txs.length > hardLimitNumberOfTransactions) {
						break;
					}
				}
				return {
					...blockWithTxBuffer,
					reward: new BigNumber(blockWithTxBuffer.reward),
					totalAmount: new BigNumber(blockWithTxBuffer.totalAmount),
					totalFee: new BigNumber(blockWithTxBuffer.totalFee),
					transactions: txs,
				};
			});
		},
		serialize: (object): Buffer => {
			const blockBuffers: Buffer[] = [];

			for (const block of object) {
				const txBuffers: Buffer[] = [];

				if (block.transactions) {
					for (const transaction of block.transactions) {
						const txBuffer = Buffer.from(transaction, "hex");
						const txLengthBuffer = Buffer.alloc(4);
						txLengthBuffer.writeUInt32BE(txBuffer.byteLength);
						txBuffers.push(txLengthBuffer, txBuffer);
					}
				}

				const blockEncoded = blocks.GetBlocksResponse.BlockHeader.encode({
					...block,
					reward: block.reward.toString(),
					totalAmount: block.totalAmount.toString(),
					totalFee: block.totalFee.toString(),
					transactions: Buffer.concat(txBuffers),
				}).finish();

				const blockBuffer = Buffer.from(blockEncoded);
				const blockLengthBuffer = Buffer.alloc(4);
				blockLengthBuffer.writeUInt32BE(blockBuffer.length);
				blockBuffers.push(blockLengthBuffer, blockBuffer);
			}

			return Buffer.concat(blockBuffers);
		},
	},
};

export const postBlock = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = blocks.PostBlockRequest.decode(payload);
			return {
				...decoded,
				block: Buffer.from(decoded.block),
			};
		},
		serialize: (object: blocks.IPostBlockRequest): Buffer =>
			Buffer.from(blocks.PostBlockRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PostBlockResponse => blocks.PostBlockResponse.decode(payload),
		serialize: (object: blocks.IPostBlockResponse): Buffer =>
			Buffer.from(blocks.PostBlockResponse.encode(object).finish()),
	},
};
