import { describe } from "@mainsail/test-runner";

import { BanList } from "./ban-list.js";
import { CloseReason } from "./enums.js";

describe<{
	banList: BanList;
}>("BanList", ({ it, assert, beforeEach, clock }) => {
	beforeEach((context) => {
		context.banList = new BanList();
	});

	it("should refuse a banned address until the ban expires", ({ banList }) => {
		const fakeTimers = clock({ now: 1_000_000, toFake: ["Date"] });

		banList.ban("1.1.1.1", 1_000_000 + 60_000);

		assert.equal(banList.verify("1.1.1.1"), CloseReason.Banned);
		assert.undefined(banList.verify("2.2.2.2"));

		fakeTimers.tick(60_000);
		assert.undefined(banList.verify("1.1.1.1"));
		assert.false(banList.isBanned("1.1.1.1"));
	});

	it("should drop expired bans when banning or listing, not only when their address is looked up", ({ banList }) => {
		const fakeTimers = clock({ now: 1_000_000, toFake: ["Date"] });

		banList.ban("1.1.1.1", 1_000_000 + 1000);
		banList.ban("2.2.2.2", 1_000_000 + 60_000);
		fakeTimers.tick(1000);

		assert.equal(banList.all(), [{ ip: "2.2.2.2", until: 1_000_000 + 60_000 }]);

		banList.ban("3.3.3.3", 1_000_000 + 60_000);
		fakeTimers.tick(60_000);
		banList.ban("4.4.4.4", 1_000_000 + 120_000);

		assert.equal(banList.all(), [{ ip: "4.4.4.4", until: 1_000_000 + 120_000 }]);
	});

	it("should forget an address on unban", ({ banList }) => {
		banList.ban("1.1.1.1", Date.now() + 60_000);
		banList.unban("1.1.1.1");

		assert.undefined(banList.verify("1.1.1.1"));
	});
});
