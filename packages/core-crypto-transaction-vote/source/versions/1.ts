import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class VoteTransaction extends Transaction {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.Vote;
	public static key = "vote";

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
				type: { transactionType: Contracts.Crypto.TransactionType.Vote },
			},
			required: ["asset"],
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		const buff: ByteBuffer = ByteBuffer.fromSize(100);

		if (data.asset && data.asset.votes) {
			const voteBytes = data.asset.votes
				.map((vote) => (vote.startsWith("+") ? "01" : "00") + vote.slice(1))
				.join("");
			buff.writeUint8(data.asset.votes.length);
			buff.writeBytes(Buffer.from(voteBytes, "hex"));
		}

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const votelength: number = buf.readUint8();
		data.asset = { votes: [] };

		for (let index = 0; index < votelength; index++) {
			let vote: string = buf
				.readBytes(this.app.get<number>(Identifiers.Cryptography.Size.PublicKey) + 1)
				.toString("hex");
			vote = (vote[1] === "1" ? "+" : "-") + vote.slice(2);

			if (data.asset && data.asset.votes) {
				data.asset.votes.push(vote);
			}
		}
	}
}
