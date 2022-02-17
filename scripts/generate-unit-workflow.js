const { readdirSync, writeFileSync } = require("fs");
const { resolve } = require("path");
const YAML = require("yaml");

const workflow = {
	name: "Unit",
	on: {
		push: {
			branches: ["main", "develop"],
		},
		pull_request: {
			types: ["ready_for_review", "synchronize", "opened"],
		},
	},
	jobs: {},
};

const directories = readdirSync(resolve("packages"), { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name)
	.sort();

for (const directory of directories) {
	if (require(`../packages/${directory}/package.json`)["scripts"]["test"] === undefined) {
		console.log(`Package [${directory}] has no [test] script.`);

		continue;
	}

	workflow.jobs[directory] = {
		"runs-on": "ubuntu-latest",
		strategy: {
			matrix: {
				"node-version": ["16.x"],
			},
		},
		concurrency: {
			group: `\${{ github.head_ref }}-unit-${directory}`,
			"cancel-in-progress": true,
		},
		steps: [
			{
				uses: "actions/checkout@v2",
				with: {
					ref: "${{ github.head_ref }}",
				},
			},
			{
				uses: "pnpm/action-setup@v2",
				with: {
					version: "latest",
					run_install: true,
				},
			},
			{
				uses: "actions/setup-node@v2",
				with: {
					"node-version": "${{ matrix.node-version }}",
					cache: "pnpm",
				},
			},
			{
				name: "Build",
				run: "pnpm run build",
			},
			{
				name: "Test",
				run: `cd packages/${directory} && pnpm run test`,
			},
		],
	};
}

writeFileSync(resolve(".github/workflows/unit.yml"), YAML.stringify(workflow, { indent: 4 }));
