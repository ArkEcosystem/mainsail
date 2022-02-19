import { SATOSHI } from "../constants";
import { configManager } from "../managers";
import { BigNumber } from "./bignum";

let genesisTransactions: { [key: string]: boolean };
let currentNetwork: number;

export const formatSatoshi = (amount: BigNumber): string => {
	const localeString = (+amount / SATOSHI).toLocaleString("en", {
		maximumFractionDigits: 8,
		minimumFractionDigits: 0,
	});

	return `${localeString} ${configManager.get("network.client.symbol")}`;
};

export const isGenesisTransaction = (id: string): boolean => {
	const network: number = configManager.get("network.pubKeyHash");

	if (!genesisTransactions || currentNetwork !== network) {
		currentNetwork = network;

		genesisTransactions = Object.fromEntries(
			configManager.get("genesisBlock.transactions").map((curr) => [curr.id, true]),
		);
	}

	return genesisTransactions[id];
};

export const numberToHex = (num: number, padding = 2): string => {
	const indexHex: string = Number(num).toString(16);

	return "0".repeat(padding - indexHex.length) + indexHex;
};

export const maxVendorFieldLength = (height?: number): number => configManager.getMilestone(height).vendorFieldLength;

export const isSupportedTransactionVersion = (version: number): boolean => {
	const aip11: boolean = configManager.getMilestone().aip11;

	if (aip11 && version !== 2) {
		return false;
	}

	if (!aip11 && version !== 1) {
		return false;
	}

	return true;
};

export { Base58 } from "./base58";
export { BigNumber } from "./bignum";
export { calculateBlockTime, isNewBlockTime } from "./block-time-calculator";
export { ByteBuffer } from "./byte-buffer";
export { isLocalHost, isValidPeer } from "./is-valid-peer";
