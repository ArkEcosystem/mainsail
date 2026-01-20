import { format as printf } from "node:util";

import type { Test } from "uvu";

export const formatName = (template: string, ...arguments_: unknown[]): string => printf(template, ...arguments_);

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
