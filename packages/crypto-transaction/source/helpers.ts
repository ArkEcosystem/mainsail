import { BigNumber } from "@arkecosystem/utils";
import { Configuration } from "@packages/crypto-config/distribution";

const SATOSHI = 1e8;

let genesisTransactions: { [key: string]: boolean };
let currentNetwork: number;

export const formatSatoshi = (configuration: Configuration, amount: BigNumber): string => {
	const localeString = (+amount / SATOSHI).toLocaleString("en", {
		maximumFractionDigits: 8,
		minimumFractionDigits: 0,
	});

	return `${localeString} ${configuration.get("network.client.symbol")}`;
};

export const isGenesisTransaction = (configuration: Configuration, id: string): boolean => {
	const network: number = configuration.get("network.pubKeyHash");

	if (!genesisTransactions || currentNetwork !== network) {
		currentNetwork = network;

		genesisTransactions = Object.fromEntries(
			configuration.get("genesisBlock.transactions").map((curr) => [curr.id, true]),
		);
	}

	return genesisTransactions[id];
};

export const numberToHex = (num: number, padding = 2): string => {
	const indexHex: string = Number(num).toString(16);

	return "0".repeat(padding - indexHex.length) + indexHex;
};

export const maxVendorFieldLength = (configuration: Configuration, height?: number): number =>
	configuration.getMilestone(height).vendorFieldLength;

export const isSupportedTransactionVersion = (configuration: Configuration, version: number): boolean => {
	const aip11: boolean = configuration.getMilestone().aip11;

	if (aip11 && version !== 2) {
		return false;
	}

	if (!aip11 && version !== 1) {
		return false;
	}

	return true;
};
