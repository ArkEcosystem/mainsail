import { Utils } from "@arkecosystem/crypto";
import { describe } from "../../../../core-test-framework";

import { Container, Contracts } from "../../index";
import { InvalidCriteria, UnexpectedError, UnsupportedValue } from "./errors";
import { StandardCriteriaService } from "./standard-criteria-service";

const delegate = {
	username: "biz_classic",
	address: "AKdr5d9AMEnsKYxpDcoHdyyjSCKVx3r9Nj",
	publicKey: "020431436cf94f3c6a6ba566fe9e42678db8486590c732ca6c3803a10a86f50b92",
	votes: Utils.BigNumber.make("303991427568137"),
	rank: 2,
	isResigned: false,
	blocks: {
		produced: 242504,
		last: {
			id: "0d51a4f17168766717cc9cbd83729a50913f7085b14c0c3fe774a020d4197688",
			height: 13368988,
			timestamp: {
				epoch: 108163200,
				human: "2020-08-24T10:20:00.000Z",
				unix: 1598264400,
			},
		},
	},
	production: {
		approval: 2.01,
	},
	forged: {
		fees: Utils.BigNumber.make("1173040419815"),
		rewards: Utils.BigNumber.make("48500800000000"),
		total: Utils.BigNumber.make("49673840419815"),
	},
};

describe<{
	container: Container.Container;
	service: any;
	check: Function;
}>("StandardCriteriaService.testStandardCriterias", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container.Container();
		context.service = context.container.resolve(StandardCriteriaService);

		context.check = <T>(value: T, ...criterias: Contracts.Search.StandardCriteriaOf<T>[]): boolean => {
			return context.container.resolve(StandardCriteriaService).testStandardCriterias(value, ...criterias);
		};
	});

	it("should match every criteria argument", (context) => {
		assert.true(context.check(2, 2, "2"));
		assert.true(context.check(2, { from: 1 }, { to: 3 }));

		assert.false(context.check(2, 2, 3));
		assert.false(context.check(2, { from: 1 }, { to: 1 }));
	});

	it("should match some criteria array item", (context) => {
		assert.true(context.check(2, [2, 3]));
		assert.true(context.check(2, [{ from: 1 }, { to: 1 }]));

		assert.false(context.check(2, [1, 3]));
		assert.false(context.check(2, [{ from: 3 }, { to: 1 }]));
	});

	it("should check boolean criteria", (context) => {
		assert.true(context.check(true, true));
		assert.true(context.check(false, false));

		assert.false(context.check(true, false));
		assert.false(context.check(false, true));
	});

	it("should check boolean literal criteria", (context) => {
		assert.true(context.check(true, "true"));
		assert.true(context.check(false, "false"));

		assert.false(context.check(true, "false"));
		assert.false(context.check(false, "true"));
	});

	it("should throw when criteria is invalid", (context) => {
		assert.rejects(() => context.check(true, "NONSENSE"), "Invalid criteria 'NONSENSE' (string) for boolean value");
	});

	it("should check string criteria", (context) => {
		assert.true(context.check("John Doe", "John Doe"));

		assert.false(context.check("John Doe", "John"));
		assert.false(context.check("John Doe", "Doe"));
	});

	it("should check string pattern criteria", (context) => {
		assert.true(context.check("John Doe", "John %"));
		assert.true(context.check("John Doe", "John %oe"));
		assert.true(context.check("John Doe", "% Doe"));
		assert.true(context.check("John Doe", "%"));
		assert.true(context.check("John Doe", "J% D%"));

		assert.false(context.check("John Doe", "% doe"));
		assert.false(context.check("John Doe", "K% D%"));
	});

	it("should throw when criteria is invalid", (context) => {
		assert.rejects(() => context.check("John Doe", 1 as any), "Invalid criteria '1' (number) for string value");
	});

	it("should check exact number criteria", (context) => {
		assert.true(context.check(1, 1));
		assert.true(context.check(1.1, 1.1));

		assert.false(context.check(1, 2));
		assert.false(context.check(1.1, 1.2));
	});

	it("should check exact string criteria", (context) => {
		assert.true(context.check(1, "1"));
		assert.true(context.check(1.1, "1.1"));

		assert.false(context.check(1, "2"));
		assert.false(context.check(1.1, "1.2"));
	});

	it("should throw when criteria is invalid", (context) => {
		assert.rejects(
			() => context.check(1, "not a number"),
			"Invalid criteria 'not a number' (string) for number value",
		);
		assert.rejects(() => context.check(1, NaN), "Invalid criteria 'NaN' (number) for number value");
		assert.rejects(
			() => context.check(1, {} as any),
			"Invalid criteria '[object Object]' (Object) for number value",
		);
		assert.rejects(() => context.check(1, null as any), "Invalid criteria 'null' for number value");
	});

	it("should check range number criteria", (context) => {
		assert.true(context.check(1, { from: 1 }));
		assert.true(context.check(1, { from: 0 }));
		assert.true(context.check(1, { to: 1 }));
		assert.true(context.check(1, { to: 2 }));
		assert.true(context.check(1, { from: 1, to: 1 }));
		assert.true(context.check(1, { from: 0, to: 2 }));

		assert.false(context.check(1, { from: 2 }));
		assert.false(context.check(1, { to: 0 }));
		assert.false(context.check(1, { from: 2, to: 3 }));
		assert.false(context.check(1, { from: -1, to: 0 }));
	});

	it("should check range string criteria", (context) => {
		assert.true(context.check(1, { from: "1" }));
		assert.true(context.check(1, { from: "0" }));
		assert.true(context.check(1, { to: "1" }));
		assert.true(context.check(1, { to: "2" }));
		assert.true(context.check(1, { from: "1", to: 1 }));
		assert.true(context.check(1, { from: 0, to: "2" }));

		assert.false(context.check(1, { from: "2" }));
		assert.false(context.check(1, { to: "0" }));
		assert.false(context.check(1, { from: "2", to: 3 }));
		assert.false(context.check(1, { from: -1, to: "0" }));
	});

	it("should throw when range criteria is invalid", (context) => {
		assert.rejects(
			() => context.check(1, { from: "a" }),
			"Invalid criteria 'a' (string) at 'from' for number value",
		);
		assert.rejects(() => context.check(1, { to: "b" }), "Invalid criteria 'b' (string) at 'to' for number value");
	});

	it("should check exact number criteria", (context) => {
		assert.true(context.check(BigInt(1), 1));
		assert.true(context.check(Utils.BigNumber.make(1), 1));

		assert.false(context.check(BigInt(1), 2));
		assert.false(context.check(Utils.BigNumber.make(1), 2));
	});

	it("should check exact BigInt criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), BigInt(1)));
		assert.false(context.check(Utils.BigNumber.make(1), BigInt(2)));
	});

	it("should check exact Utils.BigNumber criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), Utils.BigNumber.make(1)));
		assert.false(context.check(Utils.BigNumber.make(1), Utils.BigNumber.make(2)));
	});

	it("should check exact string criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), "1"));
		assert.false(context.check(Utils.BigNumber.make(1), "2"));
	});

	it("should throw when criteria is invalid", (context) => {
		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), "1.1"),
			"Invalid criteria '1.1' (string) for BigNumber value",
		);

		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), "a"),
			"Invalid criteria 'a' (string) for BigNumber value",
		);

		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), NaN),
			"Invalid criteria 'NaN' (number) for BigNumber value",
		);

		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), {} as any),
			"Invalid criteria '[object Object]' (Object) for BigNumber value",
		);
	});

	it("should check range number criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), { from: 1 }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: 0 }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: 1 }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: 2 }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: 1, to: 1 }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: 0, to: 2 }));

		assert.false(context.check(Utils.BigNumber.make(1), { from: 2 }));
		assert.false(context.check(Utils.BigNumber.make(1), { to: 0 }));
		assert.false(context.check(Utils.BigNumber.make(1), { from: 2, to: Utils.BigNumber.make(3) }));
		assert.false(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(-1), to: 0 }));
	});

	it("should check range BigInt criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), { from: BigInt(1) }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: BigInt(0) }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: BigInt(1) }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: BigInt(2) }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: BigInt(1), to: 1 }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: 0, to: BigInt(2) }));

		assert.false(context.check(Utils.BigNumber.make(1), { from: BigInt(2) }));
		assert.false(context.check(Utils.BigNumber.make(1), { to: BigInt(0) }));
		assert.false(context.check(Utils.BigNumber.make(1), { from: BigInt(2), to: Utils.BigNumber.make(3) }));
		assert.false(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(-1), to: BigInt(0) }));
	});

	it("should check range Utils.BigNumber criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(1) }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(0) }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: Utils.BigNumber.make(1) }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: Utils.BigNumber.make(2) }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(1), to: 1 }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: 0, to: Utils.BigNumber.make(2) }));

		assert.false(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(2) }));
		assert.false(context.check(Utils.BigNumber.make(1), { to: Utils.BigNumber.make(0) }));

		assert.false(
			context.check(Utils.BigNumber.make(1), {
				from: Utils.BigNumber.make(2),
				to: Utils.BigNumber.make(3),
			}),
		);

		assert.false(
			context.check(Utils.BigNumber.make(1), {
				from: Utils.BigNumber.make(-1),
				to: Utils.BigNumber.make(0),
			}),
		);
	});

	it("should check range string criteria", (context) => {
		assert.true(context.check(Utils.BigNumber.make(1), { from: "1" }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: "0" }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: "1" }));
		assert.true(context.check(Utils.BigNumber.make(1), { to: "2" }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: "1", to: 1 }));
		assert.true(context.check(Utils.BigNumber.make(1), { from: 0, to: "2" }));

		assert.false(context.check(Utils.BigNumber.make(1), { from: "2" }));
		assert.false(context.check(Utils.BigNumber.make(1), { to: "0" }));
		assert.false(context.check(Utils.BigNumber.make(1), { from: "2", to: Utils.BigNumber.make(3) }));
		assert.false(context.check(Utils.BigNumber.make(1), { from: Utils.BigNumber.make(-1), to: "0" }));
	});

	it("should throw when range criteria is invalid", (context) => {
		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), { from: "a" }),
			"Invalid criteria 'a' (string) at 'from' for BigNumber value",
		);

		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), { to: "b" }),
			"Invalid criteria 'b' (string) at 'to' for BigNumber value",
		);

		assert.rejects(
			() => context.check(Utils.BigNumber.make(1), { invalid: "criteria" } as any),
			"Invalid criteria '[object Object]' (Object) for BigNumber value",
		);
	});

	it("should check every criteria property", (context) => {
		const value = {
			a: 1,
			b: "hello world",
			c: {
				d: Utils.BigNumber.make(5),
			},
		};

		assert.true(context.check(value, { a: 1, b: "hello world" }));
		assert.false(context.check(value, { a: 1, e: 5 } as any));
		assert.true(context.check(value, { a: 1, c: { d: { from: 5 } } }));
		assert.false(context.check(value, { a: 1, c: { d: { from: 6 } } }));
	});

	it("should check every object property when criteria is wildcard", (context) => {
		const value = {
			owner: "alice",
			user: "bob",
		};

		assert.true(context.check(value, { "*": "alice" }));
		assert.false(context.check(value, { "*": "dave" }));
	});

	it("should re-throw error", (context) => {
		const value = {
			owner: "alice",
			user: "bob",
		};

		assert.rejects(
			() => context.check(value, { "*": [{}] }),
			"Invalid criteria '[object Object]' (Object) at '*.0' for string value",
		);
	});

	it("should re-throw error if called with multiple criteria", (context) => {
		const value = {
			owner: "alice",
			user: "bob",
		};

		// @ts-ignore
		assert.rejects(
			() => context.check(value, { user: 1, owner: "bob" } as any),
			"Invalid criteria '1' (number) at 'user' for string value",
		);
	});

	it("should throw an error", (context) => {
		assert.rejects(() => context.check([1, 2, 3], {} as any), "Unsupported value Array(3)");
	});

	it("should check delegate's username", (context) => {
		assert.true(context.check(delegate, { username: "biz_classic" }));
		assert.true(context.check(delegate, { username: "biz_%" }));
		assert.false(context.check(delegate, { username: "john" }));
	});

	it("should check delegate's username and rank", (context) => {
		assert.true(context.check(delegate, { username: "biz_classic", rank: { to: 10 } }));
		assert.false(context.check(delegate, { username: "biz_classic", rank: { from: 5 } }));
	});

	it("should check delegate's last produced block", (context) => {
		assert.true(context.check(delegate, { blocks: { last: { height: 13368988 } } }));
	});

	it("should throw InvalidCriteria", (context) => {
		const invalidCriteria = new InvalidCriteria("a", "b", ["original_key"]);

		assert.rejects(() => {
			context.service.rethrowError(invalidCriteria, "key");
		}, "Invalid criteria 'b' (string) at 'key.original_key' for string value");
	});

	it("should throw UnsupportedValue", (context) => {
		const unsupportedValue = new UnsupportedValue("a", ["original_key"]);

		assert.rejects(() => {
			context.service.rethrowError(unsupportedValue, "key");
		}, "Unsupported value 'a' (string) at 'key.original_key'");
	});

	it("should throw UnexpectedError", (context) => {
		const unexpectedError = new UnexpectedError(new Error("test"), ["original_key"]);

		assert.rejects(() => {
			context.service.rethrowError(unexpectedError, "key");
		}, "Unexpected error 'test' (Error) at 'key.original_key'");
	});

	it("should throw UnexpectedError from error", (context) => {
		assert.rejects(() => {
			context.service.rethrowError(new Error("test"), "key");
		}, "Unexpected error 'test' (Error) at 'key'");
	});
});
