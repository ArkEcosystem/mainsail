import { ClientRequest, globalAgent, IncomingMessage } from "http";
import { request, RequestOptions } from "https";
import { Primitive } from "type-fest";
import { parse } from "url";

import { isObject } from "./is-object";
import { isUndefined } from "./is-undefined";

const sendRequest = (method: string, url: string, options?: HttpOptions): Promise<HttpResponse> =>
	new Promise((resolve, reject) => {
		if (!isObject(options)) {
			options = {};
		}

		options = { ...options, ...parse(url) };
		options.method = method.toLowerCase();

		if (options.protocol === "http:") {
			options.agent = globalAgent;
		}

		if (isUndefined(options.timeout)) {
			options.timeout = 1500;
		}

		const request_: ClientRequest = request(options, (r: IncomingMessage): void => {
			let accumulator = "";

			r.setEncoding("utf8");

			r.on("data", (chunk: string) => (accumulator += chunk));

			r.on("end", (): void => {
				const response: HttpResponse = {
					data: "",
					headers: r.rawHeaders,
					method,
					statusCode: r.statusCode,
					statusMessage: r.statusMessage,
				};

				const type: string | undefined = r.headers["content-type"];

				if (type && accumulator && type.includes("application/json")) {
					try {
						accumulator = JSON.parse(accumulator);
					} catch (error) {
						return reject(new HttpError(response, error));
					}
				}

				response.statusCode = r.statusCode;
				response.statusMessage = r.statusMessage;
				response.data = accumulator;

				if (r.statusCode && r.statusCode >= 400) {
					return reject(new HttpError(response));
				}

				return resolve(response);
			});
		});

		request_.on("error", reject);

		request_.on("timeout", () => request_.abort());

		if (options.body) {
			const body: string = JSON.stringify(options.body);

			request_.setHeader("content-type", "application/json");
			request_.setHeader("content-length", Buffer.byteLength(body));
			request_.write(body);
		}

		request_.end();
	});

export type HttpOptions = RequestOptions & { body?: Record<string, Primitive> };

export type HttpResponse = {
	method: string | undefined;
	statusCode: number | undefined;
	statusMessage: string | undefined;
	data: any;
	headers: string[];
};

export class HttpError extends Error {
	public constructor(response: HttpResponse, error?: Error) {
		const message: string | undefined = error ? error.message : response.statusMessage;

		super(message);

		Object.defineProperty(this, "message", {
			enumerable: false,
			value: message,
		});

		Object.defineProperty(this, "name", {
			enumerable: false,
			value: this.constructor.name,
		});

		Object.defineProperty(this, "response", {
			enumerable: false,
			value: {
				data: response.data,
				headers: response.headers,
				statusCode: response.statusCode,
				statusMessage: response.statusMessage,
			},
		});

		Error.captureStackTrace(this, this.constructor);
	}
}

export const http = {
	delete: (url: string, options?: HttpOptions): Promise<HttpResponse> => sendRequest("DELETE", url, options),
	get: (url: string, options?: HttpOptions): Promise<HttpResponse> => sendRequest("GET", url, options),
	head: (url: string, options?: HttpOptions): Promise<HttpResponse> => sendRequest("HEAD", url, options),
	patch: (url: string, options?: HttpOptions): Promise<HttpResponse> => sendRequest("PATCH", url, options),
	post: (url: string, options?: HttpOptions): Promise<HttpResponse> => sendRequest("POST", url, options),
	put: (url: string, options?: HttpOptions): Promise<HttpResponse> => sendRequest("PUT", url, options),
};
