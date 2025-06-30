import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { decodeRlp, ethers, getAddress, RlpStructuredData } from "ethers";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async deserialize(serialized: Buffer | string): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		let rlpBuffer =
			typeof serialized === "string"
				? Buffer.from(serialized.startsWith("0x") ? serialized.slice(2) : serialized, "hex")
				: serialized;

		// Remove type prefix (e.g. 02) if it's a EIP1559 tx (`decodeRlp` expects input to be without)
		let prefix: number | undefined = undefined;
		if (rlpBuffer[0] < 0xc0) {
			prefix = rlpBuffer[0];
			if (prefix !== 0x02) {
				throw new Error("expected EIP1559 transaction");
			}

			rlpBuffer = rlpBuffer.subarray(1);
		}

		const decoded = decodeRlp(new Uint8Array(rlpBuffer));

		if (typeof prefix !== "undefined") {
			this.#decodeEIP1559Transaction(decoded, data);
			serialized = Buffer.concat([Buffer.from([prefix]), rlpBuffer]);
		} else {
			this.#decodeLegacyTransaction(decoded, data);
			serialized = rlpBuffer;
		}

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);
		instance.serialized = serialized;

		return instance;
	}

	#decodeEIP1559Transaction(decoded: RlpStructuredData, data: Contracts.Crypto.TransactionData): void {
		if (decoded.length < 9 || decoded.length > 13) {
			throw new Error("RLP data out of range");
		}

		const recipientAddressRaw = this.#parseAddress(decoded[5].toString());

		data.network = Number(decoded[0]);
		data.nonce = BigNumber.make(this.#parseNumber(decoded[1].toString()));

		// we do not support a priority fee and thus always expect a 0 value here.
		if (this.#parseNumber(decoded[2].toString()) !== 0) {
			throw new Error("priority fee must be 0");
		}

		data.gasPrice = this.#parseNumber(decoded[3].toString());
		data.gas = this.#parseNumber(decoded[4].toString());
		data.to = recipientAddressRaw ? getAddress(recipientAddressRaw) : undefined;
		data.value = this.#parseBigNumber(decoded[6].toString());
		data.data = this.#parseData(decoded[7].toString());
		data.rlpPrefix = 0x02;

		// Signature
		if (decoded.length >= 12) {
			data.v = this.#parseNumber(decoded[9].toString());
			data.r = decoded[10].toString().slice(2);
			data.s = decoded[11].toString().slice(2);

			// Legacy second signature is only supported for EIP-1559 transactions
			if (decoded.length === 13) {
				data.legacySecondSignature = decoded[12].toString().slice(2);
			}
		}
	}

	#decodeLegacyTransaction(decoded: RlpStructuredData, data: Contracts.Crypto.TransactionData): void {
		if (decoded.length < 6 || decoded.length > 9) {
			throw new Error("legacy RLP data out of range");
		}

		// [nonce, gasPrice, gasLimit, to, value, data, v, r, s];
		data.nonce = BigNumber.make(this.#parseNumber(decoded[0].toString()));
		data.gasPrice = this.#parseNumber(decoded[1].toString());
		data.gas = this.#parseNumber(decoded[2].toString());

		const recipientAddressRaw = this.#parseAddress(decoded[3].toString());
		data.to = recipientAddressRaw ? getAddress(recipientAddressRaw) : undefined;

		data.value = this.#parseBigNumber(decoded[4].toString());
		data.data = this.#parseData(decoded[5].toString());

		// NOTE:
		// The chainId is encoded in 'v' which is part of the optional signature.
		// In the case of absence default to the config for the chainId.

		// Signature
		if (decoded.length >= 9) {
			const v = this.#parseNumber(decoded[6].toString());
			const chainId = Math.floor((v - 35) / 2);

			data.network = chainId;

			const normalizedV = v - (chainId * 2 + 35);
			data.v = normalizedV;

			data.r = decoded[7].toString().slice(2);
			data.s = decoded[8].toString().slice(2);
		} else {
			data.network = this.configuration.get("network.chainId");
		}
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
