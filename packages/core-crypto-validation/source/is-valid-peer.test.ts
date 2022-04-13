import { describe } from "../../core-test-framework";
import os from "os";

import { isValidPeer } from "./is-valid-peer";

describe("isValidPeer", ({ it, assert }) => {
	it("should not be ok for 127.0.0.1", () => {
		assert.false(isValidPeer({ ip: "127.0.0.1" }));
	});

	it("should not be ok for ::ffff:127.0.0.1", () => {
		const peer = { ip: "::ffff:127.0.0.1" };
		assert.false(isValidPeer(peer));
	});

	it("should not be ok for 0.0.0.0", () => {
		assert.false(isValidPeer({ ip: "0.0.0.0" }));
	});

	it("should not be ok for ::1", () => {
		const peer = { ip: "::1" };
		assert.false(isValidPeer(peer));
	});

	it("should not be ok for 2130706433", () => {
		const peer = { ip: "2130706433" };
		assert.false(isValidPeer(peer));
	});

	it("should not be ok for garbage", () => {
		assert.false(isValidPeer({ ip: "garbage" }));
	});

	it("should not be ok for LAN addresses", () => {
		const interfaces = os.networkInterfaces();
		const addresses = [];

		// getting local addresses
		for (const iface of Object.keys(interfaces)) {
			interfaces[iface].some((iface) => (addresses as any).push(iface.address));
		}

		for (const ipAddress of addresses) {
			assert.false(isValidPeer({ ip: ipAddress }));
		}
	});

	it("should be ok", () => {
		assert.true(isValidPeer({ ip: "192.168.178.0" }));
		assert.true(isValidPeer({ ip: "5.196.105.32" }));
		assert.true(isValidPeer({ ip: "5.196.105.32" }));
		assert.true(isValidPeer({ ip: "5.196.105.32" }));
	});
});
