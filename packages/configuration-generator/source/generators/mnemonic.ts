import { injectable } from "@mainsail/container";
import { entropyToMnemonic, generateMnemonic } from "bip39";
import { sha256 } from "ethers";

@injectable()
export class MnemonicGenerator {
	generate(): string {
		return generateMnemonic(256);
	}

	generateMany(count: number): string[] {
		return Array.from({ length: count }, () => this.generate());
	}

	generateDeterministic(seed: string): string {
		const entropy = sha256(Buffer.from(seed, "utf8")).slice(2, 34);
		return entropyToMnemonic(Buffer.from(entropy, "hex"));
	}
}
