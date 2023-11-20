import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { ByteBuffer } from "@mainsail/utils";

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
				type: { transactionType: Contracts.Crypto.TransactionType.ValidatorResignation },
			},
		});
	}

	public assetSize(): number {
		return 0;
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer> {
		return ByteBuffer.fromSize(0);
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		return;
	}
}
