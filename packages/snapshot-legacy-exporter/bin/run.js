import envPaths from "env-paths";
import path from "path";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";

process.env.MAINSAIL_DB_HOST = "localhost";
process.env.MAINSAIL_DB_PORT = "5432";
process.env.MAINSAIL_DB_DATABASE = "test_db";
process.env.MAINSAIL_DB_USERNAME = "test_db";
process.env.MAINSAIL_DB_PASSWORD = "password";

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");

	const app = await makeApplication(configCore, {});
	const generator = app.get(Identifiers.Snapshot.Generator);

	await generator.generate({});

	// await generator.generateStatic(
	// 	{ hash: "a1b8d3f6e9c2a0b4d7e1f0c8a3b5d6e7f9a0b1c3d4e5f6a7b8c9d0e1f2a3b4c5", number: 0 },
	// 	[
	// 		{ arkAddress: "DFF4dzL2ZoFeGdcCbER4gfmuWBEVbEnU5f", publicKey: "034b7f14dd621010d9719a027971dac8e00e00467b3c6d5945e0a5ced797b13b2d", balance: "10000000000",
	// 			attributes: { delegate: { username: "valdiator_1" }}
	// 		},
	// 		{ arkAddress: "DFf62eynQTZDoTLADQdxW7EJEGV4xcGT1f", publicKey: "03b36b275ef33b7527d08fa5cf29c04ff142a427f228f1c4d02161c76a7404bef5", balance: "20000000000",
	// 			attributes: { delegate: { username: "valdiator_2" }}
	// 		},
	// 		{ arkAddress: "DFFDDbGwiuPMMYvcnzJhLrZdjnuUPwEVRS", publicKey: "020074030f3577eb683bb215340c5994654f4634556a33744bf81f15d92815c99d", balance: "30000000000",
	// 			attributes: { delegate: { username: "valdiator_3" }}
	// 		},
	// 		{ arkAddress: "DFfemTprUzXAh6E9f1hzchbnNgk4QBSsRg", publicKey: "0244cb74943034d85e4a18e0b60a58d535ae9f94cf170ec16e94ca283a2c0eb712", balance: "40000000000",
	// 			attributes: { delegate: { username: "valdiator_4" }}
	// 		},
	// 		{ arkAddress: "DFfEqb9Caqi7jmdkeg861eURxL8DS3pK8x", publicKey: "0269051b0fe83c5bfc5e343ccb63c40d575666cf9476057bb2b66b1ae3827cb08a", balance: "50000000000",
	// 			attributes: { delegate: { username: "valdiator_5" }}
	// 		},
	// 		{ arkAddress: "DFfFDrrppKzVTK5frHYh6JJP73UeD2MZnC", publicKey: "02a1a95d0445074b2ef84c66ffcb203ef838c398a8b802ef7441d6ffc88b326d1e", balance: "10" },
	// 		{ arkAddress: "DFFgVGsEoVQtnVoaBoHHZJyqWEX8tsxzwP", publicKey: undefined, balance: "20" }
	// 	]
	// );
}

run();
