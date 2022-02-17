import { pluralize } from "./pluralize";

describe("#pluralize", () => {
	it("should plural words when the count is above 1", () => {
		expect(pluralize("block")).toBe("block");
		expect(pluralize("block", 0)).toBe("blocks");
		expect(pluralize("block", 1)).toBe("block");
		expect(pluralize("block", 2)).toBe("blocks");
		expect(pluralize("block", 2, true)).toBe("2 blocks");

		expect(pluralize("transaction")).toBe("transaction");
		expect(pluralize("transaction", 0)).toBe("transactions");
		expect(pluralize("transaction", 1)).toBe("transaction");
		expect(pluralize("transaction", 2)).toBe("transactions");
		expect(pluralize("transaction", 2, true)).toBe("2 transactions");

		expect(pluralize("wallet")).toBe("wallet");
		expect(pluralize("wallet", 0)).toBe("wallets");
		expect(pluralize("wallet", 1)).toBe("wallet");
		expect(pluralize("wallet", 2)).toBe("wallets");
		expect(pluralize("wallet", 2, true)).toBe("2 wallets");

		expect(pluralize("delegate")).toBe("delegate");
		expect(pluralize("delegate", 0)).toBe("delegates");
		expect(pluralize("delegate", 1)).toBe("delegate");
		expect(pluralize("delegate", 2)).toBe("delegates");
		expect(pluralize("delegate", 2, true)).toBe("2 delegates");

		expect(pluralize("peer")).toBe("peer");
		expect(pluralize("peer", 0)).toBe("peers");
		expect(pluralize("peer", 1)).toBe("peer");
		expect(pluralize("peer", 2)).toBe("peers");
		expect(pluralize("peer", 2, true)).toBe("2 peers");

		expect(pluralize("distinct overheight block header")).toBe("distinct overheight block header");
		expect(pluralize("distinct overheight block header", 0)).toBe("distinct overheight block headers");
		expect(pluralize("distinct overheight block header", 1)).toBe("distinct overheight block header");
		expect(pluralize("distinct overheight block header", 2)).toBe("distinct overheight block headers");
		expect(pluralize("distinct overheight block header", 2, true)).toBe("2 distinct overheight block headers");

		expect(pluralize("inactive delegate")).toBe("inactive delegate");
		expect(pluralize("inactive delegate", 0)).toBe("inactive delegates");
		expect(pluralize("inactive delegate", 1)).toBe("inactive delegate");
		expect(pluralize("inactive delegate", 2)).toBe("inactive delegates");
		expect(pluralize("inactive delegate", 2, true)).toBe("2 inactive delegates");
	});
});
