import { format as concordance } from "concordance";
import { format } from "string-kit";
import * as uvu from "uvu";

export const formatName = (name: string, dataset: unknown): string => format(name, concordance(dataset));

export const each =
	(test: uvu.Test) =>
	(name: string, callback: uvu.Callback<any>, datasets: unknown[]): void => {
		for (const dataset of datasets) {
			uvu.test(formatName(name, dataset), async (context: uvu.Context) => callback({ context, dataset }));
		}
	};
