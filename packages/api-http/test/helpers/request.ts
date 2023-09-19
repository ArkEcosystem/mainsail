
import got, { PlainResponse } from "got";

export const request = async <T = Record<string, any>>(path: string, options?: any): Promise<{ statusCode: number, data: T }> => {
    path = path.startsWith("/") ? path.slice(1) : path;

    const response = await got(`http://localhost:4003/api/${path}`);
    // console.log(response);

    const { statusCode, body } = response;
    return { statusCode, data: JSON.parse(body) as T };
}