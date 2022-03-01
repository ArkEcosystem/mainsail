import { Container } from "@arkecosystem/core-container";
import { ISerializeOptions, TransactionType, TransactionTypeGroup } from "@arkecosystem/core-crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export class VoteTransaction extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.Vote;
	public static key = "vote";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("100000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "vote",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						votes: {
							additionalItems: false,
							items: { $ref: "walletVote" },
							maxItems: 2,
							minItems: 1,
							type: "array",
						},
					},
					required: ["votes"],
					type: "object",
				},
				fee: { bignumber: { minimum: 1 } },
				recipientId: { $ref: "address" },
				type: { transactionType: TransactionType.Vote },
			},
			required: ["asset"],
		});
	}

	public async serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(100));

		if (data.asset && data.asset.votes) {
			const voteBytes = data.asset.votes
				.map((vote) => (vote.startsWith("+") ? "01" : "00") + vote.slice(1))
				.join("");
			buff.writeUInt8(data.asset.votes.length);
			buff.writeBuffer(Buffer.from(voteBytes, "hex"));
		}

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const votelength: number = buf.readUInt8();
		data.asset = { votes: [] };

		for (let index = 0; index < votelength; index++) {
			let vote: string = buf.readBuffer(33).toString("hex"); // 33=schnorr,34=ecdsa
			vote = (vote[1] === "1" ? "+" : "-") + vote.slice(2);

			if (data.asset && data.asset.votes) {
				data.asset.votes.push(vote);
			}
		}
	}
}
