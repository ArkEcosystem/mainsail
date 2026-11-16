import { describe } from "@mainsail/test-runner";
import { canonicalAddress, cleanAddress, isIPv6Address, isValidAddress, normalizeAddress } from "./ip-address";

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
