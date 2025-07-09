import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { decodeRlp, ethers, getAddress } from "ethers";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async deserialize(serialized: Buffer | string): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		const encodedRlp =
			"0x" + (typeof serialized === "string" ? serialized : serialized.toString("hex"));

		console.debug("Deserializing transaction from RLP:", encodedRlp);

		const decoded = decodeRlp(encodedRlp);

		console.debug("Decoded RLP:", decoded);

		const recipientAddressRaw = this.#parseAddress(decoded[3].toString());

		// data.network = Number(decoded[0]);
		data.nonce = BigNumber.make(this.#parseNumber(decoded[0].toString()));

		// // we do not support a priority fee and thus always expect a 0 value here.
		// if (this.#parseNumber(decoded[2].toString()) !== 0) {
		// 	throw new Error("priority fee must be 0");
		// }

		data.gasPrice = this.#parseNumber(decoded[1].toString());
		data.gasLimit = this.#parseNumber(decoded[2].toString());
		data.to = recipientAddressRaw ? getAddress(recipientAddressRaw) : undefined;
		data.value = this.#parseBigNumber(decoded[4].toString());
		data.data = this.#parseData(decoded[5].toString());

		// TODO: Check access list is empty

		// Signature
		if (decoded.length >= 9) {
			data.v = this.#parseNumber(decoded[6].toString()) - (10000 * 2 + 35);
			data.r = decoded[7].toString().slice(2);
			data.s = decoded[8].toString().slice(2);

			// Legacy second signature
			if (decoded.length === 10) {
				data.legacySecondSignature = decoded[9].toString().slice(2);
			}
		}

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);

		// const eip2930Prefix = "01"; // marker for Type 1 (EIP2930)
		instance.serialized = Buffer.from(`${encodedRlp.slice(2)}`, "hex");

		return instance;
	}

	#parseNumber(value: string): number {
		return value === "0x" ? 0 : Number(value);
	}

	#parseBigNumber(value: string): BigNumber {
		return value === "0x" ? BigNumber.ZERO : BigNumber.make(ethers.getBigInt(value));
	}

	#parseAddress(value: string): string | undefined {
		return value === "0x" ? undefined : value;
	}

	#parseData(value: string): string {
		return value === "0x" ? "" : value;
	}
}
