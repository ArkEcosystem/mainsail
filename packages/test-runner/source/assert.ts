import { format } from "concordance";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import type { Message } from "uvu/assert";
import { Assertion, equal, fixture, instance, is, match, not, ok, throws, type, unreachable } from "uvu/assert";
import type { ZodRawShape } from "zod";
import { z } from "zod";

interface Constructable {
	new (...arguments_: any): any;
}

type BigIntLike = {
	toBigInt?: () => bigint;
	toString(): string;
};

const normalize = (value: unknown): unknown => {
	if (
		value &&
		typeof value === "object" &&
		"toBigInt" in value &&
		typeof (value as BigIntLike).toBigInt === "function"
	) {
		return value.toString();
	}

	return value;
};

// Overrides: snapshot, equal, throws, not.equal, not.throws

export const assert = {
	array: (value: unknown): void => ok(Array.isArray(value)),
	boolean: (value: unknown): void => type(value, "boolean"),
	buffer: (value: unknown): void => instance(value, Buffer),
	bufferArray: (values: unknown[]): void => ok(values.every((value) => value instanceof Buffer)),
	containKey: (value: object, key: string): void => assert.true(Object.keys(value).includes(key)),
	containKeys: (value: object, keys: string[]): void => {
		for (const key of keys) {
			ok(value[key] !== undefined);
		}
	},
	containValues: (value: object, key: string): void => assert.false(Object.values(value).includes(key)),
	defined: (value: unknown): void => ok(value !== undefined, "Expected value to be defined."),
	empty: (value: any): void => ok(!value || value.length === 0 || Object.keys(value).length === 0),
	equal: (a: unknown, b: unknown): void => {
		equal(normalize(a), normalize(b));
	},
	false: (value: unknown): void => is(value, false),
	fixture,
	function: (value: unknown): void => type(value, "function"),
	gt: (a: number, b: number): void => ok(a > b),
	gte: (a: number, b: number): void => ok(a >= b),
	includeAllMembers: (values: unknown[], items: unknown[]): void => ok(items.every((item) => values.includes(item))),
	instance,
	is,
	length: (value: string | unknown[], length: number): void => is(value.length, length),
	lt: (a: number, b: number): void => ok(a < b),
	lte: (a: number, b: number): void => ok(a <= b),
	match,
	matchesObject: (value: unknown, schema: ZodRawShape): void => not.throws(() => z.object(schema).parse(value)),
	not: {
		...not,
		containKey: (value: object, key: string): void => assert.false(Object.keys(value).includes(key)),
		defined: (value: unknown): void => ok(value === undefined, "Expected value not to be defined."),
		empty: (value: unknown[]): void => ok(Object.keys(value).length > 0),
		equal: (a: unknown, b: unknown): void => {
			not.equal(normalize(a), normalize(b));
		},
		matchesObject: (value: unknown, schema: ZodRawShape): void => throws(() => z.object(schema).parse(value)),
		undefined: (value: unknown): void => ok(value !== undefined, "Expected value not to be undefined."),
	},
	null: (value: unknown): void => ok(value === null),
	number: (value: unknown): void => type(value, "number"),
	object: (value: unknown): void => type(value, "object"),
	ok,
	positive: (value: number): void => ok(value > 0),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	rejects: async (callback: Function, ...expected: (Message | Constructable)[]): Promise<void> => {
		try {
			await callback();

			ok(false, "Expected promise to be rejected but it resolved.");
		} catch (error) {
			if (error instanceof Assertion) {
				throw error;
			}

			for (const item of expected) {
				if (item instanceof Error) {
					instance(error, item);
				}

				if (typeof item === "function") {
					instance(error, item);
				}

				if (typeof item === "string") {
					ok(error.message.includes(item) || error.name.includes(item));
				}
			}

			ok(true);
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	resolves: async (callback: Function): Promise<void> => {
		try {
			await callback();

			ok(true);
		} catch (error) {
			if (error instanceof Assertion) {
				throw error;
			}

			ok(false, "Expected promise to be resolved but it rejected.");
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
	startsWith: (value: string, prefix: string): void => ok(value.startsWith(prefix)),
	string: (value: unknown): void => type(value, "string"),
	stringArray: (values: unknown[]): void => ok(values.every((value) => typeof value === "string")),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	throws: (function_: Function, expects?: Message | RegExp | Function): void => {
		if (typeof expects === "string") {
			expects = new RegExp(expects);
		}

		throws(function_, expects);
	},
	true: (value: unknown): void => is(value, true),
	truthy: (value: unknown): void => ok(!!value),
	type,
	undefined: (value: unknown): void => ok(value === undefined, "Expected value to be undefined."),
	unreachable,
};
