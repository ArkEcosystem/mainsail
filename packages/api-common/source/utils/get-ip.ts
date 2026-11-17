import type { Request } from "@hapi/hapi";

import { assert, IpAddress } from "@mainsail/utils";

const headerToString = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value)) {
		return value.filter((entry): entry is string => typeof entry === "string").join(",");
	}

	return undefined;
};

const forwardedIp = (request: Request): string | undefined => {
	const entry = headerToString(request.headers["x-forwarded-for"])?.split(",").at(-1)?.trim();

	return entry ? IpAddress.canonicalAddress(entry) : undefined;
};

export const getIp = (request: Request, trustProxy: boolean): string => {
	const ip =
		(trustProxy ? forwardedIp(request) : undefined) ?? IpAddress.canonicalAddress(request.info.remoteAddress);
	assert.string(ip);

	return ip;
};
