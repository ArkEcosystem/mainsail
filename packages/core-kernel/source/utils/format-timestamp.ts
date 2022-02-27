import { IConfiguration } from "@arkecosystem/core-crypto-contracts";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const formatTimestamp = (
	epochStamp: number,
	configuration: IConfiguration,
): {
	epoch: number;
	unix: number;
	human: string;
} => {
	const timestamp: Dayjs = dayjs.utc(configuration.getMilestone().epoch).add(epochStamp, "second");

	return {
		epoch: epochStamp,
		human: timestamp.toISOString(),
		unix: timestamp.unix(),
	};
};
