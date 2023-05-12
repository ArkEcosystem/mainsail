enum Symbols {
	days = "d",
	hours = "h",
	minutes = "m",
	seconds = "s",
	milliseconds = "ms",
	microseconds = "µs",
	nanoseconds = "ns",
}

export const prettyTime = (value: number): string => {
	const fragments: string[] = [];

	const types: Record<string, number> = {
		days: Math.floor(value / 86_400_000),
		hours: Math.floor(value / 3_600_000) % 24,
		microseconds: Math.floor(value * 1000) % 1000,
		milliseconds: Math.floor(value) % 1000,
		minutes: Math.floor(value / 60_000) % 60,
		nanoseconds: Math.floor(value * 1e6) % 1000,
		seconds: Math.floor(value / 1000) % 60,
	};

	for (const type of ["days", "hours", "minutes", "seconds", "milliseconds", "microseconds", "nanoseconds"]) {
		const value: number | undefined = types[type];

		if (value && value > 0) {
			fragments.push(`${value}${Symbols[type]}`);
		}
	}

	return fragments.join(" ");
};
