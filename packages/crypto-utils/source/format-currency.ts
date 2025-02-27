import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const formatCurrency = (configuration: Contracts.Crypto.Configuration, amount: BigNumber): string => {
	const { decimals, denomination } = configuration.getMilestone().satoshi;

	const localeString = (+amount / denomination).toLocaleString("en", {
		maximumFractionDigits: decimals,
		minimumFractionDigits: 0,
	});

	return `${localeString} ${configuration.get("network.client.symbol")}`;
};
