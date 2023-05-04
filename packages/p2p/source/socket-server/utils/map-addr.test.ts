import { Identifiers } from "@mainsail/contracts";
import { describe } from "../../../../core-test-framework";

import { mapAddr } from "./map-addr";

describe("mapAddr", ({ it, assert }) => {
	it("should map IP 'v6' to IP v4 counterpart", () => {
		const ipv6 = "::ffff:192.168.1.1";
		const ipv4 = "192.168.1.1";
		assert.equal(mapAddr(ipv6), ipv4);
	});

	it("should map a real IP v6 to itself", () => {
		const ipv6 = "2001:db8:3312::1";
		assert.equal(mapAddr(ipv6), ipv6);
	});
});
