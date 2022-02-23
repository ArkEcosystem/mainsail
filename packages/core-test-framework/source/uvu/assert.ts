import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { BigNumber } from "@arkecosystem/utils";
import { format } from "concordance";
import { join } from "path";
import * as uvu from "uvu/assert";
import { z, ZodRawShape } from "zod";

interface Constructable {
	new (...arguments_: any): any;
}

export const assert = {
	...uvu,
	array: (value: unknown): void => uvu.ok(Array.isArray(value)),
	boolean: (value: unknown): void => uvu.type(value, "boolean"),
	buffer: (value: unknown): void => uvu.instance(value, Buffer),
	bufferArray: (values: unknown[]): void => uvu.ok(values.every((value) => value instanceof Buffer)),
	containKey: (value: object, key: string): void => assert.true(Object.keys(value).includes(key)),
	containKeys: (value: object, keys: string[]): void => {
		for (const key of keys) {
			uvu.ok(value[key] !== undefined);
		}
	},
	containValues: (value: object, key: string): void => assert.false(Object.values(value).includes(key)),
	defined: (value: unknown): void => uvu.ok(value !== undefined, "Expected value to be defined."),
	empty: (value: any): void => uvu.ok(!value || value.length === 0 || Object.keys(value).length === 0),
	equal: (a: any, b: any): void => {
		if (a instanceof BigNumber) {
			a = a.toString();
		}

		if (b instanceof BigNumber) {
			b = b.toString();
		}

		uvu.equal(a, b);
	},
	false: (value: unknown): void => uvu.is(value, false),
	function: (value: unknown): void => uvu.type(value, "function"),
	gt: (a: number, b: number): void => uvu.ok(a > b),
	gte: (a: number, b: number): void => uvu.ok(a >= b),
	includeAllMembers: (values: unknown[], items: unknown[]): void =>
		uvu.ok(items.every((item) => values.includes(item))),
	length: (value: string | unknown[], length: number): void => uvu.is(value.length, length),
	lt: (a: number, b: number): void => uvu.ok(a < b),
	lte: (a: number, b: number): void => uvu.ok(a <= b),
	matchesObject: (value: unknown, schema: ZodRawShape): void => uvu.not.throws(() => z.object(schema).parse(value)),
	not: {
		...uvu.not,
		containKey: (value: object, key: string): void => assert.false(Object.keys(value).includes(key)),
		defined: (value: unknown): void => uvu.ok(value === undefined, "Expected value not to be defined."),
		empty: (value: unknown[]): void => uvu.ok(Object.keys(value).length > 0),
		equal: (a: any, b: any): void => {
			if (a instanceof BigNumber) {
				a = a.toString();
			}

			if (b instanceof BigNumber) {
				b = b.toString();
			}

			uvu.not.equal(a, b);
		},
		matchesObject: (value: unknown, schema: ZodRawShape): void => uvu.throws(() => z.object(schema).parse(value)),
		undefined: (value: unknown): void => uvu.ok(value !== undefined, "Expected value not to be undefined."),
	},
	null: (value: unknown): void => uvu.ok(value === null),
	number: (value: unknown): void => uvu.type(value, "number"),
	object: (value: unknown): void => uvu.type(value, "object"),
	rejects: async (callback: Function, ...expected: (uvu.Message | Constructable)[]): Promise<void> => {
		try {
			await callback();

			uvu.ok(false, "Expected promise to be rejected but it resolved.");
		} catch (error) {
			if (error instanceof uvu.Assertion) {
				throw error;
			}

			for (const item of expected) {
				if (item instanceof Error) {
					uvu.instance(error, item);
				}

				if (typeof item === "function") {
					uvu.instance(error, item);
				}

				if (typeof item === "string") {
					uvu.ok(error.message.includes(item) || error.name.includes(item));
				}
			}

			uvu.ok(true);
		}
	},
	resolves: async (callback: Function): Promise<void> => {
		try {
			await callback();

			uvu.ok(true);
		} catch (error) {
			if (error instanceof uvu.Assertion) {
				throw error;
			}

			uvu.ok(false, "Expected promise to be resolved but it rejected.");
		}
	},
	snapshot: (name: string, value: unknown): void => {
		const directory: string = join(process.cwd(), "snapshots");

		if (!existsSync(directory)) {
			mkdirSync(directory, { recursive: true });
		}

		const snapshot: string = join(directory, `${name}.snapshot`);

		const updateSnapshots: boolean = process.argv.includes("--update-snapshots");

		if (updateSnapshots) {
			unlinkSync(snapshot);
		}

		if (!existsSync(snapshot)) {
			writeFileSync(snapshot, format(value));
		}

		assert.is(format(value), readFileSync(snapshot).toString());
	},
	startsWith: (value: string, prefix: string): void => uvu.ok(value.startsWith(prefix)),
	string: (value: unknown): void => uvu.type(value, "string"),
	stringArray: (values: unknown[]): void => uvu.ok(values.every((value) => typeof value === "string")),
	throws: (fn: Function, expects?: uvu.Message | RegExp | Function): void => {
		if (typeof expects === "string") {
			expects = new RegExp(expects);
		}

		uvu.throws(fn, expects);
	},
	true: (value: unknown): void => uvu.is(value, true),
	truthy: (value: unknown): void => uvu.ok(!!value),
	undefined: (value: unknown): void => uvu.ok(value === undefined, "Expected value to be undefined."),
};
