import { format as concordance } from "concordance";
import kit from "string-kit";
import { Callback, Context, Test } from "uvu";

export const formatName = (name: string, dataset: unknown): string => kit.format(name, concordance(dataset));

export const each =
	(test: Test) =>
	(name: string, callback: Callback<any>, datasets: unknown[]): void => {
		for (const dataset of datasets) {
			test(formatName(name, dataset), async (context: Context) => callback({ context, dataset }));
		}
	};
