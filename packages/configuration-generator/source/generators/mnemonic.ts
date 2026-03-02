import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { entropyToMnemonic, generateMnemonic } from "bip39";

@injectable()
export class MnemonicGenerator {
	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	generate(): string {
		return generateMnemonic(256);
	}

	generateMany(count: number): string[] {
		return Array.from({ length: count }, () => this.generate());
	}

	generateDeterministic(seed: string): string {
		const entropy = this.hashFactory.sha256(Buffer.from(seed, "utf8"));
		return entropyToMnemonic(entropy);
	}
}
