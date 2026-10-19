import { describe } from "@mainsail/test-runner";
import { getPeerIp } from "./get-peer-ip";

describe("getPeerIp", ({ it, assert }) => {
	const wsRequest = (remoteAddress: unknown) => ({ socket: { info: { remoteAddress } } }) as any;
	const httpRequest = (remoteAddress: unknown) => ({ info: { remoteAddress } }) as any;

	it("should take the address from the socket for a websocket request", () => {
		assert.equal(getPeerIp(wsRequest("1.2.3.4")), "1.2.3.4");
	});

	it("should take the address from the request for an http request", () => {
		assert.equal(getPeerIp(httpRequest("1.2.3.4")), "1.2.3.4");
	});

	it("should prefer the socket address over the request address", () => {
		const request = { ...wsRequest("1.2.3.4"), ...httpRequest("5.6.7.8") };

		assert.equal(getPeerIp(request), "1.2.3.4");
	});

	it("should map an ipv4-mapped ipv6 address to its ipv4 counterpart", () => {
		assert.equal(getPeerIp(wsRequest("::ffff:192.168.1.1")), "192.168.1.1");
		assert.equal(getPeerIp(httpRequest("::ffff:192.168.1.1")), "192.168.1.1");
	});

	it("should return a real ipv6 address in its canonical form", () => {
		assert.equal(getPeerIp(wsRequest("2001:db8:3312::1")), "2001:db8:3312::1");
		assert.equal(getPeerIp(wsRequest("2001:0db8:3312:0000:0000:0000:0000:0001")), "2001:db8:3312::1");
	});

	it("should throw when the address is missing or not an ip", () => {
		assert.throws(() => getPeerIp(wsRequest(undefined)));
		assert.throws(() => getPeerIp(httpRequest(undefined)));
		assert.throws(() => getPeerIp(wsRequest("garbage")));
	});
});
