import { randomBytes } from "crypto";

export const randomBase64 = (length: number): string =>
	randomBytes(Math.ceil((length * 3) / 4))
		.toString("base64")
		.slice(0, length)
		.replaceAll("+", "0")
		.replaceAll("/", "0");
