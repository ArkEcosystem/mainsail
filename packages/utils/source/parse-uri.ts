import { isNull } from "./is-null";

interface URIScheme {
	scheme: string | undefined;
	authority: string | undefined;
	path: string | undefined;
	query: string | undefined;
	fragment: string | undefined;
}

export const parseURI = (value: string): URIScheme | undefined => {
	const matches: RegExpExecArray | null = new RegExp(
		"^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?",
	).exec(value);

	if (isNull(matches)) {
		return undefined;
	}

	return {
		authority: matches[4],
		fragment: matches[9],
		path: matches[5],
		query: matches[7],
		scheme: matches[2],
	};
};
