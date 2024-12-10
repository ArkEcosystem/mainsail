import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { decodeRlp } from "ethers";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async deserialize(serialized: Buffer | string): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		const encodedRlp =
			"0x" + (typeof serialized === "string" ? serialized.slice(2) : serialized.toString("hex").slice(2));

		const decoded = decodeRlp(encodedRlp);

		data.network = Number(decoded[0]);
		data.nonce = BigNumber.make(this.#parseNumber(decoded[1].toString()));
		data.gasPrice = this.#parseNumber(decoded[3].toString());
		data.gasLimit = this.#parseNumber(decoded[4].toString());
		data.recipientAddress = this.#parseAddress(decoded[5].toString());
		data.value = BigNumber.make(this.#parseNumber(decoded[6].toString()));
		data.data = this.#parseData(decoded[7].toString());

		if (decoded.length === 12) {
			data.v = this.#parseNumber(decoded[9].toString()) + 27;
			data.r = decoded[10].toString().slice(2);
			data.s = decoded[11].toString().slice(2);
		}

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);

		const eip1559Prefix = "02"; // marker for Type 2 (EIP1559) transaction which is the standard nowadays
		instance.serialized = Buffer.from(`${eip1559Prefix}${encodedRlp.slice(2)}`, "hex");

		return instance;
	}

	#parseNumber(value: string): number {
		return value === "0x" ? 0 : Number(value);
	}

	#parseAddress(value: string): string | undefined {
		return value === "0x" ? undefined : value;
	}

	#parseData(value: string): string {
		return value === "0x" ? "" : value;
	}
}
