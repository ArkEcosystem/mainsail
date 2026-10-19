import os from "os";

import { describe } from "@mainsail/test-runner";
import { isLocalHost, isPublicIp, isValidPeerIp } from "./is-valid-peer";

describe("isValidPeer", ({ it, assert }) => {
	it("#isPublicIp - should be ok for a globally routable address", () => {
		for (const ip of ["1.2.3.4", "8.8.8.8", "2606:4700::1111", "::ffff:1.2.3.4"]) {
			assert.true(isPublicIp(ip), ip);
		}
	});

	it("#isPublicIp - should not be ok for a non-public or invalid address", () => {
		for (const ip of [
			"127.0.0.1",
			"10.0.0.1",
			"172.16.0.1",
			"192.168.1.1",
			"169.254.169.254",
			"100.64.0.1",
			"0.0.0.0",
			"224.0.0.1",
			"::1",
			"::",
			"fe80::1",
			"fd00::1",
			"::ffff:10.0.0.1",
			"2001:db8::1",
			"garbage",
			"",
		]) {
			assert.false(isPublicIp(ip), ip);
		}
	});

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

	it("#isValidPeerIp - should not be ok for 127.0.0.1", () => {
		assert.false(isValidPeerIp("127.0.0.1"));
	});

	it("#isValidPeerIp - should not be ok for ::ffff:127.0.0.1", () => {
		assert.false(isValidPeerIp("::ffff:127.0.0.1"));
	});

	it("#isValidPeerIp - should not be ok for 0.0.0.0", () => {
		assert.false(isValidPeerIp("0.0.0.0"));
	});

	it("#isValidPeerIp - should not be ok for ::1", () => {
		assert.false(isValidPeerIp("::1"));
	});

	it("#isValidPeerIp - should not be ok for 2130706433", () => {
		assert.false(isValidPeerIp("2130706433"));
	});

	it("#isValidPeerIp - should not be ok for garbage", () => {
		assert.false(isValidPeerIp("garbage"));
	});

	it("should not be ok for LAN addresses", () => {
		const interfaces = os.networkInterfaces();
		const addresses = [];

		// getting local addresses
		for (const iface of Object.keys(interfaces)) {
			interfaces[iface].some((iface) => (addresses as any).push(iface.address));
		}

		for (const ipAddress of addresses) {
			assert.false(isValidPeerIp(ipAddress));
		}
	});

	it("#isValidPeerIp - should be true", () => {
		assert.true(isValidPeerIp("192.168.178.0"));
		assert.true(isValidPeerIp("5.196.105.32"));
	});

	it("#isValidPeerIp - should be false", () => {
		assert.false(isValidPeerIp("127.0.0.1"));
		assert.false(isValidPeerIp("test"));
	});
});
