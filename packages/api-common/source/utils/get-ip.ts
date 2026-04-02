import type { Request } from "@hapi/hapi";

const headerToString = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value.join(",") : value;

export const getIp = (request: Request, trustProxy: boolean): string => {
	if (trustProxy) {
		const forwardedFor = headerToString(request.headers["x-forwarded-for"]);
		return forwardedFor?.split(",")[0]?.trim() ?? request.info.remoteAddress;
	}

	return request.info.remoteAddress;
};
