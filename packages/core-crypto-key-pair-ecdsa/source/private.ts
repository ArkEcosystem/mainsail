import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IKeyPairFactory, IPrivateKeyFactory } from "@arkecosystem/core-crypto-contracts";

@Container.injectable()
export class PrivateKeyFactory implements IPrivateKeyFactory {
	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.keyPairFactory.fromMnemonic(mnemonic)).privateKey;
	}

	public async fromWIF(wif: string, version: number): Promise<string> {
		return (await this.keyPairFactory.fromWIF(wif, version)).privateKey;
	}
}
