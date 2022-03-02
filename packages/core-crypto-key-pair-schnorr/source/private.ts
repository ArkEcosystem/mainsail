import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";

@Container.injectable()
export class PrivateKeyFactory implements Crypto.IPrivateKeyFactory {
	@Container.inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.keyPairFactory.fromMnemonic(mnemonic)).privateKey;
	}

	public async fromWIF(wif: string): Promise<string> {
		return (await this.keyPairFactory.fromWIF(wif)).privateKey;
	}
}
