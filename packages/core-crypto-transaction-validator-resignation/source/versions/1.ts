import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class ValidatorResignationTransaction extends Transaction {
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.ValidatorResignation;
	public static key = "validatorResignation";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("2500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "validatorResignation",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				fee: { bignumber: { minimum: 1 } },
				type: { transactionType: Contracts.Crypto.TransactionType.ValidatorResignation },
			},
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		return new ByteBuffer(Buffer.alloc(0));
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		return;
	}
}
