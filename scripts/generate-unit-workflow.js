const { readdirSync, writeFileSync } = require("fs");
const { resolve } = require("path");
const YAML = require("yaml");

const workflow = {
	jobs: {
		unit: {
			concurrency: {
				"cancel-in-progress": true,
				group: `\${{ github.head_ref }}-unit`,
			},
			"runs-on": "ubuntu-latest",
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
						run_install: true,
						version: "latest",
					},
				},
				{
					uses: "actions/setup-node@v2",
					with: {
						cache: "pnpm",
						"node-version": "${{ matrix.node-version }}",
					},
				},
				{
					name: "Build",
					run: "pnpm run build",
				},
			],
			strategy: {
				matrix: {
					"node-version": ["16.x"],
				},
			},
		},
	},
	name: "CI",
	on: {
		pull_request: {
			types: ["ready_for_review", "synchronize", "opened"],
		},
		push: {
			branches: ["main", "develop"],
		},
	},
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

	workflow.jobs.unit.steps.push({
		name: `Test ${directory}`,
		run: `cd packages/${directory} && pnpm run test`,
	});
}

writeFileSync(resolve(".github/workflows/unit.yml"), YAML.stringify(workflow, { indent: 4 }));
