import { http, HttpOptions, HttpResponse } from "@mainsail/utils";

export class RestClient {
	public static async get(path: string, options?: HttpOptions): Promise<HttpResponse> {
		return http.get(`http://localhost:4003/api/${path}`, options);
	}

	public static async post(path: string, body): Promise<HttpResponse> {
		return http.post(`http://localhost:4003/api/${path}`, { body });
	}

	public static async broadcast(transactions): Promise<HttpResponse> {
		return this.post("transactions", { transactions });
	}
}
