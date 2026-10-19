import type { Contracts } from "@mainsail/contracts";

export const formatCurrency = (configuration: Contracts.Crypto.Configuration, amount: bigint): string => {
	const { decimals, denomination } = configuration.getMilestone().satoshi;
	const { symbol } = configuration.getNetwork().client;

	if (denomination <= 0) {
		throw new Error("Invalid denomination");
	}

	const scale = BigInt(denomination);
	const absolute = amount < 0n ? -amount : amount;
	const whole = (absolute / scale).toLocaleString("en");
	const fraction = (absolute % scale).toString().padStart(decimals, "0").replace(/0+$/, "");

	const sign = amount < 0n ? "-" : "";
	const decimalPart = fraction === "" ? "" : `.${fraction}`;

	return `${sign}${whole}${decimalPart} ${symbol}`;
};
