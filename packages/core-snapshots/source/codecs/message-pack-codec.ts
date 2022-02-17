import { Models } from "@arkecosystem/core-database";
import { Container } from "@arkecosystem/core-kernel";
import { Blocks, Interfaces, Transactions, Utils } from "@arkecosystem/crypto";
import { decode, encode } from "msgpack-lite";
import { camelizeKeys } from "xcase";

import { Codec } from "../contracts";
import { Codec as CodecException } from "../exceptions";

@Container.injectable()
export class MessagePackCodec implements Codec {
	private static removePrefix(item: Record<string, any>, prefix: string): Record<string, any> {
		const itemToReturn = {};

		for (const key of Object.keys(item)) {
			itemToReturn[key.replace(prefix, "")] = item[key];
		}

		return itemToReturn;
	}

	public encodeBlock(block: any): Buffer {
		try {
			const blockCamelized = camelizeKeys(MessagePackCodec.removePrefix(block, "Block_"));

			return Blocks.Serializer.serialize(blockCamelized, true);
		} catch (error) {
			throw new CodecException.BlockEncodeException(block.Block_id, error.message);
		}
	}

	public decodeBlock(buffer: Buffer): Models.Block {
		try {
			return Blocks.Deserializer.deserialize(buffer, false).data as Models.Block;
		} catch (error) {
			throw new CodecException.BlockDecodeException(undefined, error.message);
		}
	}

	public encodeTransaction(transaction: any): Buffer {
		try {
			return encode([
				transaction.Transaction_id,
				transaction.Transaction_block_id,
				transaction.Transaction_block_height,
				transaction.Transaction_sequence,
				transaction.Transaction_timestamp,
				transaction.Transaction_serialized,
			]);
		} catch (error) {
			throw new CodecException.TransactionEncodeException(transaction.Transaction_id, error.message);
		}
	}

	public decodeTransaction(buffer: Buffer): Models.Transaction {
		let transactionId = undefined;
		try {
			const [id, blockId, blockHeight, sequence, timestamp, serialized] = decode(buffer);
			transactionId = id;

			const transaction: Interfaces.ITransaction = Transactions.TransactionFactory.fromBytesUnsafe(
				serialized,
				id,
			);

			/* istanbul ignore next */
			return {
				amount: transaction.data.amount,
				blockHeight: blockHeight,
				blockId: blockId,

				fee: transaction.data.fee,

				id: id,

				nonce: Utils.BigNumber.make(transaction.data.nonce || 0),

				// @ts-ignore
				asset: transaction.data.asset,

				// @ts-ignore
				recipientId: transaction.data.recipientId,

				senderPublicKey: transaction.data.senderPublicKey,

				sequence: sequence,

				serialized: serialized,

				version: transaction.data.version,

				timestamp: timestamp,

				type: transaction.data.type,

				typeGroup: transaction.data.typeGroup || 1,

				vendorField: transaction.data.vendorField,
			};
		} catch (error) {
			throw new CodecException.TransactionDecodeException(transactionId as unknown as string, error.message);
		}
	}

	public encodeRound(round: any): Buffer {
		try {
			const roundCamelized = camelizeKeys(MessagePackCodec.removePrefix(round, "Round_"));

			return encode([roundCamelized.publicKey, roundCamelized.balance, roundCamelized.round]);
		} catch (error) {
			throw new CodecException.RoundEncodeException(round.Round_round, error.message);
		}
	}

	public decodeRound(buffer: Buffer): Models.Round {
		try {
			const [publicKey, balance, round] = decode(buffer);

			return {
				balance,
				publicKey,
				round,
			};
		} catch (error) {
			throw new CodecException.RoundDecodeException(undefined, error.message);
		}
	}
}
