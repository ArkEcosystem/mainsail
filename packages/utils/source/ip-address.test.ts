import { describe } from "@mainsail/test-runner";
import os from "os";

import {
	canonicalAddress,
	canonicalPatterns,
	cleanAddress,
	isIPv6Address,
	isLocalHost,
	isPublicIp,
	isValidAddress,
	isValidPeerIp,
	normalizeAddress,
	sanitizeRemoteAddress,
	subnetAddress,
} from "./ip-address";

describe("isValidAddress", ({ assert, it }) => {
	it("should return true for valid IPv6 address", () => {
		assert.true(isValidAddress("2001:3984:3989::104"));
	});

	it("should return true for localhost IPv6 address", () => {
		assert.true(isValidAddress("::1"));
	});

	it("should return true for :: IPv6 address", () => {
		assert.true(isValidAddress("::"));
	});

	it("should return true for valid IPv6 address in brackets", () => {
		assert.true(isValidAddress("[2001:3984:3989::104]"));
	});

	it("should return false for invalid IPv6 address", () => {
		assert.false(isValidAddress("2001:3984:3989:104:1:2001:3984:3989:10")); // Too long address
	});

	it("should return true for valid IPv4 address", () => {
		assert.true(isValidAddress("127.0.0.1"));
	});

	it("should return true for invalid IPv4 address", () => {
		assert.false(isValidAddress("127.0.0.300"));
	});

	it("should return false for random string", () => {
		assert.false(isValidAddress("random"));
	});
});

describe("isIPv6Address", ({ assert, it }) => {
	it("should return true for valid IPv6 address", () => {
		assert.true(isIPv6Address("2001:3984:3989::104"));
	});

	it("should return true for localhost IPv6 address", () => {
		assert.true(isIPv6Address("::1"));
	});

	it("should return true for :: IPv6 address", () => {
		assert.true(isIPv6Address("::"));
	});

	it("should return true for valid IPv6 address in brackets", () => {
		assert.true(isIPv6Address("[2001:3984:3989::104]"));
	});

	it("should return false for invalid IPv6 address", () => {
		assert.false(isIPv6Address("2001:3984:3989:104:1:2001:3984:3989:10")); // Too long address
	});

	it("should return false for valid IPv4 address", () => {
		assert.false(isIPv6Address("127.0.0.1"));
	});

	it("should return false for random string", () => {
		assert.false(isIPv6Address("random"));
	});
});

describe("normalizeAddress", ({ assert, it }) => {
	it("should return normalized IPv6 address", () => {
		assert.equal(normalizeAddress("2001:3984:3989::104"), "[2001:3984:3989::104]");
	});

	it("should return normalized localhost IPv6 address", () => {
		assert.equal(normalizeAddress("::1"), "[::1]");
	});

	it("should return normalized :: IPv6 address", () => {
		assert.equal(normalizeAddress("::"), "[::]");
	});

	it("should keep normalized IPv6 address in brackets", () => {
		assert.equal(normalizeAddress("[2001:3984:3989::104]"), "[2001:3984:3989::104]");
	});

	it("should return same IPv4 address", () => {
		assert.equal(normalizeAddress("127.0.0.1"), "127.0.0.1");
	});

	it("should return same random string", () => {
		assert.equal(normalizeAddress("random"), "random");
	});
});

describe("cleanAddress", ({ assert, it }) => {
	it("should return clean IPv6 address", () => {
		assert.equal(cleanAddress("2001:3984:3989::104"), "2001:3984:3989::104");
	});

	it("should return clean localhost IPv6 address", () => {
		assert.equal(cleanAddress("::1"), "::1");
	});

	it("should return clean :: IPv6 address", () => {
		assert.equal(cleanAddress("::"), "::");
	});

	it("should keep clean IPv6 address in brackets", () => {
		assert.equal(cleanAddress("[2001:3984:3989::104]"), "2001:3984:3989::104");
	});

	it("should return same IPv4 address", () => {
		assert.equal(cleanAddress("127.0.0.1"), "127.0.0.1");
	});

	it("should return same random string", () => {
		assert.equal(cleanAddress("random"), "random");
	});
});

describe("canonicalAddress", ({ assert, it }) => {
	it("should map an IPv4-mapped IPv6 address to IPv4", () => {
		assert.is(canonicalAddress("::ffff:1.2.3.4"), "1.2.3.4");
	});

	it("should map an uppercase IPv4-mapped IPv6 address to IPv4", () => {
		assert.is(canonicalAddress("::FFFF:1.2.3.4"), "1.2.3.4");
	});

	it("should keep an IPv4 address", () => {
		assert.is(canonicalAddress("1.2.3.4"), "1.2.3.4");
	});

	it("should keep a plain IPv6 address", () => {
		assert.is(canonicalAddress("2001:db8::1"), "2001:db8::1");
	});

	it("should compress an expanded IPv6 address", () => {
		assert.is(canonicalAddress("2001:0db8:0000:0000:0000:0000:0000:0001"), "2001:db8::1");
	});

	it("should lowercase an IPv6 address", () => {
		assert.is(canonicalAddress("2001:DB8::ABCD"), "2001:db8::abcd");
	});

	it("should keep the IPv6 loopback address", () => {
		assert.is(canonicalAddress("::1"), "::1");
	});

	it("should return undefined for an invalid address", () => {
		assert.undefined(canonicalAddress("not-an-ip"));
	});

	it("should return undefined for an IPv4-compatible IPv6 address", () => {
		assert.undefined(canonicalAddress("::1.2.3.4"));
		assert.undefined(canonicalAddress("::127.0.0.1"));
	});

	it("should return undefined for a missing address", () => {
		assert.undefined(canonicalAddress(undefined as unknown as string));
	});

	it("should return undefined for a bracketed address", () => {
		assert.undefined(canonicalAddress("[::1]"));
		assert.undefined(canonicalAddress("[2001:db8::1]:443"));
		assert.undefined(canonicalAddress("1.2.[3.4"));
	});
});

describe("canonicalPatterns", ({ assert, it }) => {
	it("should write literal addresses in canonical form", () => {
		assert.equal(
			canonicalPatterns(["127.0.0.1", "::ffff:1.2.3.4", "2001:0DB8:0000:0000:0000:0000:0000:0001", "::1"]),
			["127.0.0.1", "1.2.3.4", "2001:db8::1", "::1"],
		);
	});

	it("should keep glob patterns as written", () => {
		assert.equal(canonicalPatterns(["*", "187.166.*", "2001:db8:*"]), ["*", "187.166.*", "2001:db8:*"]);
	});

	it("should keep entries that are not addresses as written", () => {
		assert.equal(canonicalPatterns(["not-an-ip", "::1.2.3.4", "[::1]"]), ["not-an-ip", "::1.2.3.4", "[::1]"]);
	});

	it("should return an empty list for an empty list", () => {
		assert.equal(canonicalPatterns([]), []);
	});
});

describe("subnetAddress", ({ assert, it }) => {
	it("should keep an IPv4 address", () => {
		assert.is(subnetAddress("1.2.3.4"), "1.2.3.4");
	});

	it("should return the /64 of an IPv6 address", () => {
		assert.is(subnetAddress("2001:db8:1:2:3:4:5:6"), "2001:db8:1:2::/64");
		assert.is(subnetAddress("2001:db8::1"), "2001:db8::/64");
	});

	it("should return the same /64 for addresses that differ only in the last 64 bits", () => {
		assert.is(subnetAddress("2001:db8:1:2::1"), subnetAddress("2001:db8:1:2:ffff:ffff:ffff:ffff"));
	});

	it("should return different /64s for addresses in neighbouring subnets", () => {
		assert.is.not(subnetAddress("2001:db8:1:2::1"), subnetAddress("2001:db8:1:3::1"));
	});

	it("should not put IPv4-mapped addresses into one subnet", () => {
		assert.is(subnetAddress("::ffff:1.2.3.4"), "::ffff:1.2.3.4");
		assert.is.not(subnetAddress("::ffff:1.2.3.4"), subnetAddress("::ffff:5.6.7.8"));
	});

	it("should return a value that is not an address as is", () => {
		assert.is(subnetAddress("not-an-ip"), "not-an-ip");
	});
});

describe("isPublicIp", ({ assert, it }) => {
	it("should be ok for a globally routable address", () => {
		for (const ip of ["1.2.3.4", "8.8.8.8", "2606:4700::1111", "::ffff:1.2.3.4"]) {
			assert.true(isPublicIp(ip), ip);
		}
	});

	it("should not be ok for a non-public or invalid address", () => {
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
});

describe("sanitizeRemoteAddress", ({ assert, it }) => {
	it("should keep a plain IPv4 address", () => {
		assert.equal(sanitizeRemoteAddress("172.30.0.11"), "172.30.0.11");
	});

	it("should collapse an IPv4-mapped IPv6 address to IPv4", () => {
		assert.equal(sanitizeRemoteAddress("::ffff:172.30.0.11"), "172.30.0.11");
	});

	it("should keep a plain IPv6 address", () => {
		assert.equal(sanitizeRemoteAddress("2606:4700::1111"), "2606:4700::1111");
	});

	it("should return undefined for an invalid address", () => {
		assert.undefined(sanitizeRemoteAddress("garbage"));
		assert.undefined(sanitizeRemoteAddress(""));
	});
});

describe("isLocalHost", ({ assert, it }) => {
	it("should be ok for loopback and unspecified addresses", () => {
		for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "0.0.0.0", "::1"]) {
			assert.true(isLocalHost(ip), ip);
		}
	});

	it("should be ok for an address of a local network interface", () => {
		for (const iface of Object.values(os.networkInterfaces()).flat()) {
			if (iface) {
				assert.true(isLocalHost(iface.address), iface.address);
			}
		}
	});

	it("should not be ok for a remote address", () => {
		assert.false(isLocalHost("5.196.105.32"));
	});

	it("should not be ok for a numeric or garbage string, with or without interfaces", () => {
		for (const value of ["2130706433", "garbage"]) {
			assert.false(isLocalHost(value));
			assert.false(isLocalHost(value, false));
		}
	});
});

describe("isValidPeerIp", ({ assert, it }) => {
	it("should be ok for a remote address, IPv4-mapped included", () => {
		for (const ip of ["192.168.178.0", "5.196.105.32", "::ffff:5.196.105.32"]) {
			assert.true(isValidPeerIp(ip), ip);
		}
	});

	it("should not be ok for loopback, unspecified or invalid addresses", () => {
		for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "0.0.0.0", "::1", "2130706433", "garbage", "test"]) {
			assert.false(isValidPeerIp(ip), ip);
		}
	});

	it("should not be ok for addresses of the local network interfaces", () => {
		for (const iface of Object.values(os.networkInterfaces()).flat()) {
			if (iface) {
				assert.false(isValidPeerIp(iface.address), iface.address);
			}
		}
	});

	it("should ignore the local network interfaces when asked to", () => {
		const address = Object.values(os.networkInterfaces())
			.flat()
			.find((iface) => iface && !isLocalHost(iface.address, false))?.address;

		if (address) {
			assert.true(isValidPeerIp(address, false));
		}
	});
});
