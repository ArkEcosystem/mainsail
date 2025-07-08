import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";

@injectable()
export class EvmCallTransaction extends Transaction {
	public static type: number = 0;
	public static key = "evmCall";

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "evmCall",
			properties: {
				data: { bytecode: {} },
				gasPrice: { transactionGasPrice: {} },
				to: { $ref: "address" },
				value: { bignumber: { maximum: undefined, minimum: 0 } },
			},
			required: ["gasPrice", "gasLimit"],
		});
	}
}
