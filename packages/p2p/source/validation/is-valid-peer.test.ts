import os from "os";

import { describe } from "../../../test-framework";
import { isLocalHost, isValidPeer } from "./is-valid-peer";

describe("isValidPeer", ({ it, assert }) => {
	it("#isLocalHost - should be ok for 127.0.0.1", () => {
		assert.true(isLocalHost("127.0.0.1"));
	});

	it("#isLocalHost - should ok for ::ffff:127.0.0.1", () => {
		assert.true(isLocalHost("::ffff:127.0.0.1"));
	});

	it("#isLocalHost - should ok for 0.0.0.0", () => {
		assert.true(isLocalHost("0.0.0.0"));
	});

	it("#isLocalHost - should ok for ::1", () => {
		assert.true(isLocalHost("::1"));
	});

	it("#isLocalHost - should not ok for 5.196.105.32", () => {
		assert.false(isLocalHost("5.196.105.32"));
	});

	it("#isLocalHost - should not ok for 2130706433", () => {
		assert.false(isLocalHost("2130706433"));
		assert.false(isLocalHost("2130706433", false));
	});

	it("#isLocalHost - should not ok for garbage", () => {
		assert.false(isLocalHost("garbage"));
		assert.false(isLocalHost("garbage", false));
	});

	it("#isValidPeer - should not be ok for 127.0.0.1", () => {
		assert.false(isValidPeer("127.0.0.1"));
	});

	it("#isValidPeer - should not be ok for ::ffff:127.0.0.1", () => {
		assert.false(isValidPeer("::ffff:127.0.0.1"));
	});

	it("#isValidPeer - should not be ok for 0.0.0.0", () => {
		assert.false(isValidPeer("0.0.0.0"));
	});

	it("#isValidPeer - should not be ok for ::1", () => {
		assert.false(isValidPeer("::1"));
	});

	it("#isValidPeer - should not be ok for 2130706433", () => {
		assert.false(isValidPeer("2130706433"));
	});

	it("#isValidPeer - should not be ok for garbage", () => {
		assert.false(isValidPeer("garbage"));
	});

	it("should not be ok for LAN addresses", () => {
		const interfaces = os.networkInterfaces();
		const addresses = [];

		// getting local addresses
		for (const iface of Object.keys(interfaces)) {
			interfaces[iface].some((iface) => (addresses as any).push(iface.address));
		}

		for (const ipAddress of addresses) {
			assert.false(isValidPeer(ipAddress));
		}
	});

	it("#isValidPeer - should be true", () => {
		assert.true(isValidPeer("192.168.178.0"));
		assert.true(isValidPeer("5.196.105.32"));
	});

	it("#isValidPeer - should be false", () => {
		assert.false(isValidPeer("127.0.0.1"));
		assert.false(isValidPeer("test"));
	});
});
