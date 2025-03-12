import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { encode } from "wif";

@injectable()
export class WIFFactory implements Contracts.Crypto.WIFFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { compressed, privateKey }: Contracts.Crypto.KeyPair = await this.keyPairFactory.fromMnemonic(mnemonic);

		return encode({
			compressed,
			privateKey: Buffer.from(privateKey, "hex"),
			version: this.configuration.get("network.wif"),
		});
	}

	public async fromKeys(keys: Contracts.Crypto.KeyPair): Promise<string> {
		return encode({
			compressed: keys.compressed,
			privateKey: Buffer.from(keys.privateKey, "hex"),
			version: this.configuration.get("network.wif"),
		});
	}
}
