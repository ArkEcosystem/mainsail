import { injectable } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class DelegateResignationTransaction extends Transaction {
	public static typeGroup: number = Crypto.TransactionTypeGroup.Core;
	public static type: number = Crypto.TransactionType.DelegateResignation;
	public static key = "delegateResignation";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("2500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "delegateResignation",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				fee: { bignumber: { minimum: 1 } },
				type: { transactionType: Crypto.TransactionType.DelegateResignation },
			},
		});
	}

	public async serialize(options?: Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		return new ByteBuffer(Buffer.alloc(0));
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		return;
	}
}
