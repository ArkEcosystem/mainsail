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

	public static getData(json: Contracts.Crypto.TransactionJson): Contracts.Crypto.TransactionData {
		const data: Contracts.Crypto.TransactionData = { ...json } as unknown as Contracts.Crypto.TransactionData;
		data.value = BigNumber.make(data.value);
		data.nonce = BigNumber.make(data.nonce);
		return data;
	}
}
