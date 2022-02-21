import { Container } from "@arkecosystem/container";
import { ISerializeOptions, TransactionType, TransactionTypeGroup } from "@arkecosystem/crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export class One extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.Vote;
	public static key = "vote";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("100000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "vote",
			required: ["asset"],
			properties: {
				type: { transactionType: TransactionType.Vote },
				amount: { bignumber: { minimum: 0, maximum: 0 } },
				fee: { bignumber: { minimum: 1 } },
				recipientId: { $ref: "address" },
				asset: {
					type: "object",
					required: ["votes"],
					properties: {
						votes: {
							type: "array",
							minItems: 1,
							maxItems: 2,
							additionalItems: false,
							items: { $ref: "walletVote" },
						},
					},
				},
			},
		});
	}

	public serialize(options?: ISerializeOptions): ByteBuffer | undefined {
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

	public deserialize(buf: ByteBuffer): void {
		const { data } = this;
		const votelength: number = buf.readUInt8();
		data.asset = { votes: [] };

		for (let index = 0; index < votelength; index++) {
			let vote: string = buf.readBuffer(34).toString("hex");
			vote = (vote[1] === "1" ? "+" : "-") + vote.slice(2);

			if (data.asset && data.asset.votes) {
				data.asset.votes.push(vote);
			}
		}
	}
}
