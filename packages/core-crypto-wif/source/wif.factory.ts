import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import wif from "wif";

@injectable()
export class WIFFactory implements Contracts.Crypto.IWIFFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { compressed, privateKey }: Contracts.Crypto.IKeyPair = await this.keyPairFactory.fromMnemonic(mnemonic);

		return wif.encode(this.configuration.get("network.wif"), Buffer.from(privateKey, "hex"), compressed);
	}

	public async fromKeys(keys: Contracts.Crypto.IKeyPair): Promise<string> {
		return wif.encode(this.configuration.get("network.wif"), Buffer.from(keys.privateKey, "hex"), keys.compressed);
	}
}
