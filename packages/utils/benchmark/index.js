const { benchmarker } = require("@faustbrian/benchmarker");
const { readdirSync } = require("fs");
const { camelCase } = require("../distribution");

benchmarker(
	"utils",
	readdirSync(__dirname)
		.filter((name) => name !== "index.js")
		.sort()
		.map((name) => ({
			name: `${camelCase(name.slice(0, -3))}`,
			scenarios: require(`./${name}`),
		})),
);
