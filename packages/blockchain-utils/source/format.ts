import type { Contracts } from "@mainsail/contracts";

type FractionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

function isFractionDigit(n: number): n is FractionDigit {
  return n >= 0 && n <= 20 && Number.isInteger(n);
}

export const formatCurrency = (configuration: Contracts.Crypto.Configuration, amount: bigint): string => {
	const { decimals, denomination } = configuration.getMilestone().satoshi;

	if(!isFractionDigit(decimals)) {
		throw new Error("Invalid decimals");
	}

	const localeString = (Number(amount) / denomination).toLocaleString("en", {
		maximumFractionDigits: decimals,
		minimumFractionDigits: 0,
	});

	return `${localeString} ${configuration.getNetwork().client.symbol}`;
};

export const formatNumber = (value: number): string => value.toLocaleString("en");
