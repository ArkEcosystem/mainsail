import { postTransactions as proto } from "./proto/protos";

// actual max transactions is enforced by schema but we set a hard limit for deserializing (way higher than in schema)
const hardLimitNumberOfTransactions = 1000;

export const postTransactions = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostTransactionsRequest.decode(payload);
			const txsBuffer = Buffer.from(decoded.transactions);
			const txs: Buffer[] = [];
			for (let offset = 0; offset < txsBuffer.byteLength - 4;) {
				const txLength = txsBuffer.readUInt32BE(offset);
				txs.push(txsBuffer.subarray(offset + 4, offset + 4 + txLength));
				offset += 4 + txLength;
				if (txs.length > hardLimitNumberOfTransactions) {
					break;
				}
			}

			return {
				...decoded,
				transactions: txs,
			};
		},
		serialize: (object): Buffer => {
			const size = object.transactions.reduce((sum: number, tx: Buffer) => sum + 4 + tx.length, 0);
			const result = Buffer.alloc(size);

			let offset = 0;
			for (const tx of object.transactions as Buffer[]) {
				offset = result.writeUInt32BE(tx.length, offset);
				offset += tx.copy(result, offset);
			}

			object = { ...object, transactions: result };

			return Buffer.from(proto.PostTransactionsRequest.encode(object).finish());
		},
	},
	response: {
		deserialize: (payload: Buffer): proto.IPostTransactionsResponse =>
			proto.PostTransactionsResponse.toObject(proto.PostTransactionsResponse.decode(payload), { defaults: true }),
		serialize: (object: proto.IPostTransactionsResponse): Buffer =>
			Buffer.from(proto.PostTransactionsResponse.encode(object).finish()),
	},
};
