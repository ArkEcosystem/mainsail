import { BigNumber } from "@arkecosystem/utils";
import { IConfiguration } from "packages/core-crypto-contracts/distribution";

const SATOSHI = 1e8;

let genesisTransactions: { [key: string]: boolean };
let currentNetwork: number;

export const formatSatoshi = (configuration: IConfiguration, amount: BigNumber): string => {
	const localeString = (+amount / SATOSHI).toLocaleString("en", {
		maximumFractionDigits: 8,
		minimumFractionDigits: 0,
	});

	return `${localeString} ${configuration.get("network.client.symbol")}`;
};

export const isGenesisTransaction = (configuration: IConfiguration, id: string): boolean => {
	const network: number = configuration.get("network.pubKeyHash");

	if (!genesisTransactions || currentNetwork !== network) {
		currentNetwork = network;

		genesisTransactions = Object.fromEntries(
			configuration.get("genesisBlock.transactions").map((current) => [current.id, true]),
		);
	}

	return genesisTransactions[id];
};

export const numberToHex = (number_: number, padding = 2): string => {
	const indexHex: string = Number(number_).toString(16);

	return "0".repeat(padding - indexHex.length) + indexHex;
};

export const maxVendorFieldLength = (configuration: IConfiguration, height?: number): number =>
	configuration.getMilestone(height).vendorFieldLength;
