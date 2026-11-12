import { describe } from "@mainsail/test-runner";

import { constants } from "../constants.js";
import { CloseReason } from "../enums.js";
import { Heartbeat } from "./heartbeat.js";

describe<{
	heartbeat: Heartbeat;
	pings: number;
	failures: CloseReason[];
}>("Heartbeat", ({ it, assert, beforeEach, clock }) => {
	beforeEach((context) => {
		context.pings = 0;
		context.failures = [];
		context.heartbeat = new Heartbeat({
			fail: (error) => context.failures.push(error.reason),
			ping: () => context.pings++,
		});
	});

	it("should ping every interval while the pongs keep coming", ({ heartbeat }) => {
		const fakeTimers = clock();
		const context = { pings: 0 };
		const watched = new Heartbeat({ fail: () => {}, ping: () => context.pings++ });

		watched.start();
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(context.pings, 1);
		watched.onPong();

		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(context.pings, 2);
		watched.onPong();

		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(context.pings, 3);

		watched.stop();
		heartbeat.stop();
	});

	it("should fail once a ping stays unanswered until the next one", ({ heartbeat }) => {
		const fakeTimers = clock();
		const failures: CloseReason[] = [];
		const watched = new Heartbeat({ fail: (error) => failures.push(error.reason), ping: () => {} });

		watched.start();
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(failures, []);

		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(failures, [CloseReason.HeartbeatTimeout]);

		// It stopped itself: no second failure.
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL * 2);
		assert.equal(failures, [CloseReason.HeartbeatTimeout]);

		heartbeat.stop();
	});

	it("should do nothing after stop", ({ heartbeat, pings }) => {
		const fakeTimers = clock();

		heartbeat.start();
		heartbeat.stop();
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL * 3);

		assert.equal(pings, 0);
	});
});
