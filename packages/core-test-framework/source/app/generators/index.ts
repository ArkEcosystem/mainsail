import { CoreConfigPaths, CryptoConfigPaths, SandboxOptions } from "../contracts";
import { CoreGenerator } from "./core";
import { CryptoGenerator } from "./crypto";

export const generateCoreConfig = (options?: SandboxOptions): CoreConfigPaths => new CoreGenerator(options).generate();

export const generateCryptoConfig = (options?: SandboxOptions): CryptoConfigPaths =>
	new CryptoGenerator(options).generate();

export const generateCryptoConfigRaw = (options?: SandboxOptions) => {
	const { crypto } = generateCryptoConfig(options);

	return {
		genesisBlock: require(crypto).genesisBlock,
		milestones: require(crypto).milestones,
		network: require(crypto).network,
	};
};
