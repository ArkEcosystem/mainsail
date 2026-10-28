import os from "os";

import { describe } from "@mainsail/test-runner";
import { isLocalHost, isPublicHttpUrl, isPublicIp, isValidPeerIp } from "./is-valid-peer";

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

	it("#isPublicHttpUrl - should be ok for a http(s) url with a public host", () => {
		for (const url of [
			"http://1.2.3.4:4003/",
			"https://1.2.3.4/api",
			"http://[2606:4700::1111]:4003/",
			"https://api.example.com/api",
			"http://example",
			"http://node.local/",
			"http://node.internal/",
		]) {
			assert.true(isPublicHttpUrl(url), url);
		}
	});

	it("#isPublicHttpUrl - should not be ok for a non-url, a wrong scheme, localhost or a non-public ip", () => {
		for (const url of [
			"",
			"not a url",
			"1.2.3.4:4003",
			// wrong scheme
			"ftp://1.2.3.4/",
			"ws://1.2.3.4:4003/",
			"file:///etc/passwd",
			"javascript:alert(1)",
			"data:text/plain,hi",
			"mailto:a@b.c",
			// localhost
			"http://localhost:4003/",
			"http://api.localhost/",
			// non-public ip literals
			"http://127.0.0.1:4003/",
			"http://10.0.0.5:4003/",
			"http://172.16.0.1/",
			"http://192.168.1.1/",
			"http://169.254.169.254/latest/meta-data",
			"http://100.64.0.1/",
			"http://0.0.0.0:4003/",
			"http://224.0.0.1/",
			"http://[::1]:4003/",
			"http://[::]/",
			"http://[fe80::1]/",
			"http://[fd00::1]/",
			"http://[::ffff:10.0.0.1]/",
			"http://[2001:db8::1]/",
		]) {
			assert.false(isPublicHttpUrl(url), url);
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
