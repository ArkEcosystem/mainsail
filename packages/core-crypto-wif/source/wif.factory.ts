import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import wif from "wif";

@Container.injectable()
export class WIFFactory implements Crypto.IWIFFactory {
	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@Container.inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { compressed, privateKey }: Crypto.IKeyPair = await this.keyPairFactory.fromMnemonic(mnemonic);

		return wif.encode(this.configuration.get("network.wif"), Buffer.from(privateKey, "hex"), compressed);
	}

	public async fromKeys(keys: Crypto.IKeyPair): Promise<string> {
		return wif.encode(this.configuration.get("network.wif"), Buffer.from(keys.privateKey, "hex"), keys.compressed);
	}
}
