import type { Message } from "uvu/assert";
import type { ZodRawShape } from "zod";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { inspect } from "node:util";
import { join } from "path";
import { Assertion, equal, fixture, instance, is, match, not, ok, throws, type, unreachable } from "uvu/assert";
import { z } from "zod";

import { ensureError } from "./ensure-error.js";

interface Constructable<T = unknown> {
	new (...arguments_: unknown[]): T;
}

type BigIntLike = {
	toBigInt?: () => bigint;
	toString(): string;
};

const normalize = (value: unknown): unknown => {
	if (!value || typeof value !== "object") {
		return value;
	}

	if ("toBigInt" in value && typeof (value as BigIntLike).toBigInt === "function") {
		return value.toString();
	}

	if (Array.isArray(value)) {
		return value.map((entry) => normalize(entry));
	}

	// Only recurse into plain objects — class instances (Buffer, Map, transactions, …)
	// are compared as-is by uvu's deep equality.
	const prototype = Object.getPrototypeOf(value);
	if (prototype === Object.prototype || prototype === null) {
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalize(entry)]));
	}

	return value;
};

const escapeRegExp = (value: string): string => value.replace(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);

const serialize = (value: unknown): string =>
	inspect(value, {
		breakLength: Infinity,
		colors: false,
		compact: false,
		depth: Infinity,
		sorted: true,
	}) + "\n";

// Overrides: snapshot, equal, throws, not.equal, not.throws

export const assert = {
	array: (value: unknown): void => ok(Array.isArray(value)),
	boolean: (value: unknown): void => type(value, "boolean"),
	buffer: (value: unknown): void => instance(value, Buffer),
	bufferArray: (values: unknown[]): void => ok(values.every((value) => value instanceof Buffer)),
	containKey: (value: object, key: string): void =>
		ok(Object.keys(value).includes(key), `Expected object to contain key [${key}].`),
	containKeys: (value: object, keys: string[]): void => {
		for (const key of keys) {
			assert.containKey(value, key);
		}
	},
	containValues: (value: object, expected: unknown): void =>
		ok(Object.values(value).includes(expected), `Expected object to contain value [${inspect(expected)}].`),
	defined: (value: unknown): void => ok(value !== undefined, "Expected value to be defined."),
	empty: (value: string | unknown[] | Record<string, unknown> | null | undefined): void =>
		ok(
			!value ||
				(typeof value === "string" && value.length === 0) ||
				(Array.isArray(value) && value.length === 0) ||
				(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0),
		),
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
	matchesObject: (value: unknown, schema: ZodRawShape): void => {
		const result = z.object(schema).safeParse(value);

		if (!result.success) {
			ok(false, z.prettifyError(result.error));
		}
	},
	not: {
		...not,
		containKey: (value: object, key: string): void =>
			ok(!Object.keys(value).includes(key), `Expected object not to contain key [${key}].`),
		defined: (value: unknown): void => ok(value === undefined, "Expected value not to be defined."),
		empty: (value: string | unknown[] | Record<string, unknown> | null | undefined): void =>
			ok(
				!!value &&
					((typeof value === "string" && value.length > 0) ||
						(Array.isArray(value) && value.length > 0) ||
						(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0)),
			),
		equal: (a: unknown, b: unknown): void => {
			not.equal(normalize(a), normalize(b));
		},
		matchesObject: (value: unknown, schema: ZodRawShape): void =>
			ok(!z.object(schema).safeParse(value).success, "Expected value not to match the given schema."),
		undefined: (value: unknown): void => ok(value !== undefined, "Expected value not to be undefined."),
	},
	null: (value: unknown): void => ok(value === null),
	number: (value: unknown): void => type(value, "number"),
	object: (value: unknown): void => type(value, "object"),
	ok,
	positive: (value: number): void => ok(value > 0),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	rejects: async (callback: Function, ...expected: (Message | Constructable)[]): Promise<void> => {
		let error: Error | undefined;

		try {
			await callback();
		} catch (rawError) {
			error = ensureError(rawError);
		}

		// Assertion failures raised inside the callback are not rejections to match against.
		if (error instanceof Assertion) {
			throw error;
		}

		ok(error, "Expected promise to be rejected but it resolved.");

		for (const item of expected) {
			if (item instanceof Error) {
				instance(error, item.constructor);
				is(error.message, item.message);
			} else if (typeof item === "function") {
				instance(error, item);
			} else if (typeof item === "string") {
				ok(error.message.includes(item) || error.name.includes(item));
			}
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	resolves: async (callback: Function): Promise<void> => {
		try {
			await callback();
		} catch (rawError) {
			const error = ensureError(rawError);
			if (error instanceof Assertion) {
				throw error;
			}

			ok(false, `Expected promise to be resolved but it rejected with: ${error.message}`);
		}
	},
	snapshot: (name: string, value: unknown): void => {
		const directory: string = join(process.cwd(), "snapshots");

		if (!existsSync(directory)) {
			mkdirSync(directory, { recursive: true });
		}

		const snapshot: string = join(directory, `${name}.snapshot`);

		const updateSnapshots: boolean = process.argv.includes("--update-snapshots");

		if (updateSnapshots || !existsSync(snapshot)) {
			writeFileSync(snapshot, serialize(value));
		}

		assert.equal(serialize(value), readFileSync(snapshot, "utf8"));
	},
	startsWith: (value: string, prefix: string): void => ok(value.startsWith(prefix)),
	string: (value: unknown): void => type(value, "string"),
	stringArray: (values: unknown[]): void => ok(values.every((value) => typeof value === "string")),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	throws: (function_: Function, expects?: Message | RegExp | Function): void => {
		if (typeof expects === "string") {
			expects = new RegExp(escapeRegExp(expects));
		}

		throws(function_, expects);
	},
	true: (value: unknown): void => is(value, true),
	truthy: (value: unknown): void => ok(!!value),
	type,
	undefined: (value: unknown): void => ok(value === undefined, "Expected value to be undefined."),
	unreachable,
};
