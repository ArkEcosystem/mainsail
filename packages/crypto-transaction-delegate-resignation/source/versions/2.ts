import { Container } from "@arkecosystem/container";

import { ISerializeOptions, TransactionType, TransactionTypeGroup } from "@arkecosystem/crypto-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";
import { schemas, Transaction } from "@arkecosystem/crypto-transaction";

@Container.injectable()
export abstract class Two extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.DelegateResignation;
	public static key = "delegateResignation";
	public static version = 2;

	protected static defaultStaticFee: BigNumber = BigNumber.make("2500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.delegateResignation;
	}

	public async verify(): Promise<boolean> {
		return this.configuration.getMilestone().aip11 && (await super.verify());
	}

	public serialize(options?: ISerializeOptions): ByteBuffer | undefined {
		return new ByteBuffer(Buffer.alloc(0));
	}

	public deserialize(buf: ByteBuffer): void {
		return;
	}
}
