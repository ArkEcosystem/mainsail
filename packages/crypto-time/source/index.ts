import { BlockTimeCalculator } from "./block-time-calculator";
import { Slots } from "./slots";

export * as Blocks from "./slots";

export const init = ({ configManager }) => {
	const calculator = new BlockTimeCalculator(configManager);

	return {
		slots: new Slots(configManager, calculator),
	};
};
