import { describe } from "@mainsail/test-runner";

import { PeerFilter } from "./peer-filter";

describe("PeerFilter", ({ it, assert }) => {
	it("should return {op:true} for empty criteria", async () => {
		assert.equal(await PeerFilter.getExpression(), { op: "true" });
	});

	it("should build an equal expression for a single ip field", async () => {
		assert.equal(await PeerFilter.getExpression({ ip: "1.1.1.1" }), {
			op: "equal",
			property: "ip",
			value: "1.1.1.1",
		});
	});

	it("should return {op:true} for an unknown key (default branch)", async () => {
		assert.equal(await PeerFilter.getExpression({ unknown: "x" } as any), { op: "true" });
	});

	it("should build an or expression for an array of ips", async () => {
		assert.equal(await PeerFilter.getExpression({ ip: ["1.1.1.1", "2.2.2.2"] }), {
			expressions: [
				{ op: "equal", property: "ip", value: "1.1.1.1" },
				{ op: "equal", property: "ip", value: "2.2.2.2" },
			],
			op: "or",
		});
	});

	it("should build an and expression when multiple fields are given", async () => {
		assert.equal(await PeerFilter.getExpression({ ip: "1.1.1.1", version: "1.0.0" }), {
			expressions: [
				{ op: "equal", property: "ip", value: "1.1.1.1" },
				{ jsonFieldAccessor: undefined, op: "equal", property: "version", value: "1.0.0" },
			],
			op: "and",
		});
	});

	it("should build a between expression for a numeric version range", async () => {
		assert.equal(await PeerFilter.getExpression({ version: { from: 1, to: 5 } as any }), {
			from: 1,
			jsonFieldAccessor: undefined,
			op: "between",
			property: "version",
			to: 5,
		});
	});

	it("should build a greaterThanEqual expression for a version 'from' bound", async () => {
		assert.equal(await PeerFilter.getExpression({ version: { from: 2 } as any }), {
			jsonFieldAccessor: undefined,
			op: "greaterThanEqual",
			property: "version",
			value: 2,
		});
	});

	it("should build an and across multiple top-level criteria", async () => {
		assert.equal(await PeerFilter.getExpression({ ip: "a" }, { ip: "b" }), {
			expressions: [
				{ op: "equal", property: "ip", value: "a" },
				{ op: "equal", property: "ip", value: "b" },
			],
			op: "and",
		});
	});
});
