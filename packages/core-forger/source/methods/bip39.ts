import { Identities } from "@arkecosystem/crypto";
import Interfaces from "@arkecosystem/core-crypto-contracts";

import { Delegate } from "../interfaces";
import { Method } from "./method";

export class BIP39 extends Method implements Delegate {
	public keys: Interfaces.IKeyPair | undefined;

	public publicKey: string;

	public address: string;

	public constructor(passphrase: string) {
		super();

		this.keys = Identities.Keys.fromPassphrase(passphrase);
		this.publicKey = this.keys.publicKey;
		this.address = Identities.Address.fromPublicKey(this.publicKey);
	}

	public forge(transactions: Interfaces.ITransactionData[], options: Record<string, any>): Interfaces.IBlock {
		return this.createBlock(this.keys, transactions, options);
	}
}
