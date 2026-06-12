import type { Test } from "uvu";

import { describe } from "./describe";
import { each, formatName } from "./each";

type Registered = { handler: (context: object) => Promise<void>; name: string };

const createRecorder = (): { registered: Registered[]; test: Test } => {
	const registered: Registered[] = [];

	const test = ((name: string, handler: (context: object) => Promise<void>): void => {
		registered.push({ handler, name });
	}) as unknown as Test;

	return { registered, test };
};

describe("formatName", ({ assert, it }) => {
	it("should return the template when there are no placeholders", () => {
		assert.is(formatName("hello"), "hello");
	});

	it("should substitute values printf-style", () => {
		assert.is(formatName("%s apples", 3), "3 apples");
		assert.is(formatName("a %s b", "x"), "a x b");
		assert.is(formatName("%d + %d", 1, 2), "1 + 2");
		assert.is(formatName("%j", { a: 1 }), '{"a":1}');
	});

	it("should leave unmatched placeholders in place", () => {
		assert.is(formatName("a %s %s", 1), "a 1 %s");
	});
});

describe("each", ({ assert, it }) => {
	it("should register one test per dataset with a formatted name", () => {
		const { registered, test } = createRecorder();

		each(test)("item %s", () => {}, [1, 2, 3]);

		assert.length(registered, 3);
		assert.equal(
			registered.map(({ name }) => name),
			["item 1", "item 2", "item 3"],
		);
	});

	it("should pass the context and dataset to the callback", async () => {
		const { registered, test } = createRecorder();

		let received: unknown;

		each(test)(
			"item %s",
			(arguments_) => {
				received = arguments_;
			},
			["dataset"],
		);

		await registered[0].handler({ hello: "world" });

		assert.equal(received, { context: { hello: "world" }, dataset: "dataset" });
	});

	it("should register nothing for an empty dataset list", () => {
		const { registered, test } = createRecorder();

		each(test)("item %s", () => {}, []);

		assert.empty(registered);
	});
});
