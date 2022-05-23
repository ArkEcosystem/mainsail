import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@arkecosystem/core-crypto-transaction";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class ValidatorResignationTransaction extends Transaction {
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.ValidatorResignation;
	public static key = "validatorResignation";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "validatorResignation",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				fee: { bignumber: { minimum: 1 } },
				type: { transactionType: Contracts.Crypto.TransactionType.ValidatorResignation },
			},
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		return ByteBuffer.fromSize(0);
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		return;
	}
}
