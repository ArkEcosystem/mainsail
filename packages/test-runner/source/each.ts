import type { Test } from "uvu";

import { format as printf } from "node:util";

export const formatName = (template: string, ...arguments_: unknown[]): string => printf(template, ...arguments_);

export type EachCallback<TDataset, TContext> = (arguments_: {
	context: TContext;
	dataset: TDataset;
}) => void | Promise<void>;

export interface Each<TContext> {
	<TDataset>(name: string, callback: EachCallback<TDataset, TContext>, datasets: TDataset[]): void;
	only<TDataset>(name: string, callback: EachCallback<TDataset, TContext>, datasets: TDataset[]): void;
	skip<TDataset>(name: string, callback: EachCallback<TDataset, TContext>, datasets: TDataset[]): void;
}

export const each = <TContext>(test: Test<TContext>): Each<TContext> => {
	const register =
		(registrar: (name: string, callback: (context: TContext) => Promise<void>) => void) =>
		<TDataset>(name: string, callback: EachCallback<TDataset, TContext>, datasets: TDataset[]): void => {
			for (const dataset of datasets) {
				registrar(formatName(name, dataset), async (context: TContext) => callback({ context, dataset }));
			}
		};

	return Object.assign(
		register((name, callback) => test(name, callback)),
		{
			only: register((name, callback) => test.only(name, callback)),
			skip: register((name, callback) => test.skip(name, callback)),
		},
	);
};
