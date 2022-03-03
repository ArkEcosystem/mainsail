import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";

import { Validator } from "../interfaces";
import { Method } from "./method";

@injectable()
export class BIP39 extends Method implements Validator {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	#passphrase: string;

	public keys: Crypto.IKeyPair | undefined;

	public publicKey: string;

	public address: string;

	public async configure(passphrase: string): Promise<BIP39> {
		this.#passphrase = passphrase;
		this.keys = await this.keyPairFactory.fromMnemonic(this.#passphrase);
		this.publicKey = this.keys.publicKey;
		this.address = await this.addressFactory.fromPublicKey(this.publicKey);

		return this;
	}

	public async forge(transactions: Crypto.ITransactionData[], options: Record<string, any>): Promise<Crypto.IBlock> {
		return this.createBlock(this.keys, transactions, options);
	}
}
