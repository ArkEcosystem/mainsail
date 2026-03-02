import got from "got";
import { IncomingHttpHeaders } from "http";

export const request = async <T = Record<string, any>>(
	path: string,
	options?: any,
): Promise<{ statusCode: number; data: T; headers: IncomingHttpHeaders }> => {
	path = path.startsWith("/") ? path.slice(1) : path;

	let fullReceipt = "";
	if (options?.fullReceipt !== undefined) {
		fullReceipt += (path.includes("?") ? "&" : "?") + `fullReceipt=${options.fullReceipt}`;
	}
	const response = await got(`http://localhost:4003/api/${path}${fullReceipt}`, {
		body: options?.body ?? undefined,
		method: options?.method ?? "GET",
	});

	const { statusCode, headers, body } = response;
	return { data: JSON.parse(body) as T, headers, statusCode };
};
