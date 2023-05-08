"use strict";
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
			d;
		if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const cli_1 = require("../../");
const container_1 = require("@mainsail/container");
const boxen_1 = __importDefault(require("boxen"));
const kleur_1 = require("kleur");
let Command = class Command extends cli_1.Commands.Command {
	constructor() {
		super(...arguments);
		this.signature = "help";
		this.description = "Displays detailed information on all commands available via CLI.";
		this.requiresNetwork = false;
	}
	async execute() {
		const commands = this.app.get(cli_1.Identifiers.Commands);
		// figure out the longest signature
		const signatures = Object.keys(commands);
		const longestSignature = signatures.reduce((a, b) => (a.length > b.length ? a : b)).length;
		// create groups
		const signatureGroups = {};
		for (const signature of signatures) {
			const groupName = signature.includes(":") ? signature.split(":")[0] : "default";
			if (!signatureGroups[groupName]) {
				signatureGroups[groupName] = [];
			}
			signatureGroups[groupName].push(signature);
		}
		// turn everything into a human readable format
		const commandsAsString = [];
		for (const [signatureGroup, signatures] of Object.entries(signatureGroups)) {
			commandsAsString.push((0, kleur_1.cyan)().bold(signatureGroup));
			for (const signature of signatures) {
				commandsAsString.push(
					`  ${signature.padEnd(longestSignature, " ")}        ${commands[signature].description}`,
				);
			}
		}
		console.log(
			(0, boxen_1.default)(
				this.components.appHeader() +
					`

${(0, kleur_1.blue)().bold("Usage")}
  command [arguments] [flags]

${(0, kleur_1.blue)().bold("Flags")}
  --help              Display the corresponding help message.
  --quiet             Do not output any message

${(0, kleur_1.blue)().bold("Arguments")}
  -v|vv|vvv          Increase the verbosity of messages: 1 for normal output, 2 for more verbose output and 3 for debug

${(0, kleur_1.blue)().bold("Available Commands")}
${commandsAsString.join("\n")}`,
				{
					// @ts-ignore
					borderStyle: "classic",
					padding: 1,
				},
			),
		);
	}
};
Command = __decorate([(0, container_1.injectable)()], Command);
exports.Command = Command;
//# sourceMappingURL=help.js.map
