import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { Method } from "./method";

@injectable()
export class BIP39 extends Method implements Contracts.Forger.Validator {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	#passphrase: string;

	public keys: Contracts.Crypto.IKeyPair | undefined;

	public publicKey: string;

	public address: string;

	public async configure(passphrase: string): Promise<BIP39> {
		this.#passphrase = passphrase;
		this.keys = await this.keyPairFactory.fromMnemonic(this.#passphrase);
		this.publicKey = this.keys.publicKey;
		this.address = await this.addressFactory.fromPublicKey(this.publicKey);

		return this;
	}

	public async forge(
		transactions: Contracts.Crypto.ITransactionData[],
		options: Record<string, any>,
	): Promise<Contracts.Crypto.IBlock> {
		return this.createBlock(this.keys, transactions, options);
	}
}
