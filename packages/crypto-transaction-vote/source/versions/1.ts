import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class VoteTransaction extends Transaction {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.Vote;
	public static key = "vote";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "vote",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					minVotesUnvotesLength: 1,
					properties: {
						unvotes: {
							items: { $ref: "publicKey" },
							maxItems: 1,
							minItems: 0,
							type: "array",
						},
						votes: {
							items: { $ref: "publicKey" },
							maxItems: 1,
							minItems: 0,
							type: "array",
						},
					},
					required: ["unvotes", "votes"],
					type: "object",
					unevaluatedProperties: false,
				},
				fee: { bignumber: { minimum: 1 } },
				recipientId: { $ref: "address" },
				type: { transactionType: Contracts.Crypto.TransactionType.Vote },
			},
			required: ["asset"],
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		Utils.assert.defined<Contracts.Crypto.IVoteAsset>(data.asset);
		const publicKeySize = this.app.getTagged<number>(Identifiers.Cryptography.Size.PublicKey, "type", "wallet");
		const buff: ByteBuffer = ByteBuffer.fromSize(
			1 + 1 + publicKeySize * data.asset.votes.length + publicKeySize * data.asset.unvotes.length,
		);

		// TODO: Check asset

		buff.writeUint8(data.asset.votes.length);
		buff.writeBytes(Buffer.from(data.asset.votes.join(""), "hex"));

		buff.writeUint8(data.asset.unvotes.length);
		buff.writeBytes(Buffer.from(data.asset.unvotes.join(""), "hex"));

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const asset: Contracts.Crypto.IVoteAsset = { unvotes: [], votes: [] };
		const publicKeySize = this.app.getTagged<number>(Identifiers.Cryptography.Size.PublicKey, "type", "wallet");

		const votelength: number = buf.readUint8();
		for (let index = 0; index < votelength; index++) {
			const vote = buf.readBytes(publicKeySize).toString("hex");

			asset.votes.push(vote);
		}

		const unvotelength: number = buf.readUint8();
		for (let index = 0; index < unvotelength; index++) {
			const unvote = buf.readBytes(publicKeySize).toString("hex");

			asset.unvotes.push(unvote);
		}

		data.asset = asset;
	}
}
