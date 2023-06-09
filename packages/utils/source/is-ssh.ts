import { protocols } from "./protocols";

export const isSSH = (value: string): boolean => {
	const results: string[] = protocols(value);

	if (results.includes("ssh") || results.includes("rsync") || results.includes("git")) {
		return true;
	}

	value = value.slice(Math.max(0, value.indexOf("://") + 3));

	return value.indexOf("@") < value.indexOf(":");
};
