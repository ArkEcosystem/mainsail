import { format as concordance } from "concordance";
import kit from "string-kit";
import type { Test } from "uvu";

export const formatName = (name: string, dataset: unknown): string => kit.format(name, concordance(dataset));

export type EachCallback<TDataset, TContext> = (arguments_: {
	context: TContext;
	dataset: TDataset;
}) => void | Promise<void>;

export const each =
	<TContext>(test: Test<TContext>) =>
	<TDataset>(name: string, callback: EachCallback<TDataset, TContext>, datasets: TDataset[]): void => {
		for (const dataset of datasets) {
			test(formatName(name, dataset), async (context: TContext) => callback({ context, dataset }));
		}
	};
