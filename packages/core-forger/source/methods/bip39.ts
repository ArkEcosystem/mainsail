import Interfaces, { BINDINGS, IAddressFactory, IKeyPairFactory } from "@arkecosystem/core-crypto-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { Delegate } from "../interfaces";
import { Method } from "./method";

@Container.injectable()
export class BIP39 extends Method implements Delegate {
	@Container.inject(BINDINGS.Identity.AddressFactory)
	private readonly addressFactory: IAddressFactory;

	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	readonly #passphrase: string;

	public keys: Interfaces.IKeyPair | undefined;

	public publicKey: string;

	public address: string;

	public constructor(passphrase: string) {
		super();

		this.#passphrase = passphrase;
	}

	public async forge(
		transactions: Interfaces.ITransactionData[],
		options: Record<string, any>,
	): Promise<Interfaces.IBlock> {
		this.keys = await this.keyPairFactory.fromMnemonic(this.#passphrase);
		this.publicKey = this.keys.publicKey;
		this.address = await this.addressFactory.fromPublicKey(this.publicKey);

		return this.createBlock(this.keys, transactions, options);
	}
}
