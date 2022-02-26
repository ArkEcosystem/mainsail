import { BigNumber } from "@arkecosystem/utils";

export const toBytesHex = (data): string => {
	const temporary: string = data ? BigNumber.make(data).toString(16) : "";

	return "0".repeat(16 - temporary.length) + temporary;
};
