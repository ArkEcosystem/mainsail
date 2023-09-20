import got from "got";
import { IncomingHttpHeaders } from "http";

export const request = async <T = Record<string, any>>(
	path: string,
	options?: any,
): Promise<{ statusCode: number; data: T, headers: IncomingHttpHeaders }> => {
	path = path.startsWith("/") ? path.slice(1) : path;

	let query = "";
	if (options?.transform === false) {
		query += "?transform=false";
	}

	const response = await got(`http://localhost:4003/api/${path}${query}`);
	// console.log(response);

	const { statusCode, headers, body } = response;
	return { statusCode, headers, data: JSON.parse(body) as T };
};
