import { injectable } from "@arkecosystem/core-container";
import { generateMnemonic } from "bip39";

@injectable()
export class MnemonicGenerator {
	generate(): string {
		return generateMnemonic(256);
	}

	generateMany(count: number): string[] {
		return Array.from({ length: count }, () => this.generate());
	}
}
