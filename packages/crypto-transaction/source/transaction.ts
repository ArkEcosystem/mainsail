import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Transaction implements Contracts.Crypto.Transaction {
	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	protected readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	public data!: Contracts.Crypto.TransactionData;
	public serialized!: Buffer;

	public get hash(): string {
		return this.data.hash;
	}

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return {
			$id: "transaction",
			properties: {
				data: { bytecode: {} },
				from: { $ref: "address" },

				gasLimit: { transactionGasLimit: {} },
				gasPrice: { transactionGasPrice: {} },

				hash: { $ref: "transactionHash" },

				// Legacy
				legacySecondSignature: {
					allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }],
					type: "string",
				},

				network: { $ref: "networkByte" },

				nonce: { bignumber: { minimum: 0 } },

				r: { $ref: "hex" },
				s: { $ref: "hex" },

				senderLegacyAddress: { type: "string" },

				senderPublicKey: { $ref: "publicKey" },

				to: { $ref: "address" },
				v: { maximum: 1, minimum: 0, type: "number" },
				value: { bignumber: { maximum: undefined, minimum: 0 } },
			},
			required: ["network", "from", "senderPublicKey", "gasPrice", "gasLimit", "value", "nonce"],
			type: "object",
		};
	}

	public static getData(json: Contracts.Crypto.TransactionJson): Contracts.Crypto.TransactionData {
		const data: Contracts.Crypto.TransactionData = { ...json } as unknown as Contracts.Crypto.TransactionData;
		data.value = BigNumber.make(data.value);
		data.nonce = BigNumber.make(data.nonce);
		return data;
	}
}
