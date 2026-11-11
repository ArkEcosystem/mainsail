import type { Request } from "@hapi/hapi";

import { IpAddress } from "@mainsail/utils";

const headerToString = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value)) {
		return value.filter((entry): entry is string => typeof entry === "string").join(",");
	}

	return undefined;
};

const remoteIp = (request: Request, trustProxy: boolean): string => {
	if (trustProxy) {
		const forwardedFor = headerToString(request.headers["x-forwarded-for"]);
		return forwardedFor?.split(",")[0]?.trim() ?? request.info.remoteAddress;
	}

	return request.info.remoteAddress;
};

export const getIp = (request: Request, trustProxy: boolean): string => {
	const ip = remoteIp(request, trustProxy);

	return IpAddress.canonicalAddress(ip) ?? ip;
};
