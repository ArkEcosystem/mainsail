import { Container } from "@arkecosystem/core-container";
import { ISerializeOptions, TransactionType, TransactionTypeGroup } from "@arkecosystem/core-crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export abstract class Two extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.DelegateResignation;
	public static key = "delegateResignation";
	public static version = 2;

	protected static defaultStaticFee: BigNumber = BigNumber.make("2500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "delegateResignation",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				fee: { bignumber: { minimum: 1 } },
				type: { transactionType: TransactionType.DelegateResignation },
			},
		});
	}

	public async verify(): Promise<boolean> {
		return this.configuration.getMilestone().aip11 && (await super.verify());
	}

	public async serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined> {
		return new ByteBuffer(Buffer.alloc(0));
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		return;
	}
}
