import chalk from "chalk";
import ts from "typescript";
import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative, resolve } from "path";

// Scans every class in packages/*/source for properties decorated with
// `@inject(...)` (constructor-injected dependencies) that are never referenced
// via `this.<name>` anywhere — i.e. dead injects that can be removed.
//
// A property is considered alive if `this.<name>` is referenced either in its
// own class or in any class that (transitively) extends it — a protected/public
// inject may legitimately be consumed by a subclass. Unrelated classes that
// happen to use the same property name do NOT keep it alive.
//
// Usage:
//   node scripts/dead-injects.js            # scan packages/
//   node scripts/dead-injects.js --json     # machine-readable output

const ROOT = resolve(join(process.cwd(), "packages"));
const JSON_OUTPUT = process.argv.includes("--json");

const collectFiles = (dir, out = []) => {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			if (entry === "node_modules" || entry === "distribution") continue;
			collectFiles(full, out);
		} else if (
			entry.endsWith(".ts") &&
			!entry.endsWith(".d.ts") &&
			!entry.endsWith(".test.ts")
		) {
			out.push(full);
		}
	}
	return out;
};

const parse = (file) =>
	ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, /* setParentNodes */ true);

// Walk every `this.<name>` access in a node and add the names to a Set.
const collectThisAccesses = (node, set) => {
	if (
		ts.isPropertyAccessExpression(node) &&
		node.expression.kind === ts.SyntaxKind.ThisKeyword
	) {
		set.add(node.name.text);
	}
	ts.forEachChild(node, (child) => collectThisAccesses(child, set));
};

const hasInjectDecorator = (member) => {
	if (!ts.canHaveDecorators(member)) return false;
	const decorators = ts.getDecorators(member) ?? [];
	return decorators.some(
		(d) =>
			ts.isCallExpression(d.expression) &&
			ts.isIdentifier(d.expression.expression) &&
			d.expression.expression.text === "inject",
	);
};

const modifierOf = (member) => {
	const flags = ts.getCombinedModifierFlags(member);
	if (flags & ts.ModifierFlags.Private) return "private";
	if (flags & ts.ModifierFlags.Protected) return "protected";
	return "public"; // default visibility in TS
};

const baseNameOf = (node) => {
	const clause = node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword);
	const expr = clause?.types[0]?.expression;
	if (!expr) return undefined;
	if (ts.isIdentifier(expr)) return expr.text;
	if (ts.isPropertyAccessExpression(expr)) return expr.name.text; // e.g. Foo.Bar -> Bar
	return undefined;
};

const files = collectFiles(ROOT);

// Pass 1: collect every class with its base, local `this.` accesses and injects.
const classes = [];
const childrenByBase = new Map(); // base class name -> [class records that extend it]

for (const file of files) {
	const sf = parse(file);

	const visit = (node) => {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
			const localUsed = new Set();
			collectThisAccesses(node, localUsed);

			const injects = [];
			for (const member of node.members) {
				if (!ts.isPropertyDeclaration(member)) continue;
				if (!hasInjectDecorator(member)) continue;
				const { line, character } = sf.getLineAndCharacterOfPosition(member.name.getStart(sf));
				injects.push({
					name: member.name.getText(sf),
					visibility: modifierOf(member),
					line: line + 1,
					column: character + 1,
				});
			}

			const record = {
				file,
				name: node.name?.text ?? "<anonymous>",
				base: baseNameOf(node),
				localUsed,
				injects,
			};
			classes.push(record);

			if (record.base) {
				if (!childrenByBase.has(record.base)) childrenByBase.set(record.base, []);
				childrenByBase.get(record.base).push(record);
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(sf);
}

// True if `name` is accessed via `this.` in the class or any transitive subclass.
const usedInHierarchy = (record, name) => {
	const seen = new Set();
	const stack = [record];
	while (stack.length) {
		const current = stack.pop();
		if (seen.has(current)) continue;
		seen.add(current);
		if (current.localUsed.has(name)) return true;
		for (const child of childrenByBase.get(current.name) ?? []) stack.push(child);
	}
	return false;
};

// Pass 2: report injects that are dead within their inheritance hierarchy.
const findings = [];
for (const record of classes) {
	for (const inject of record.injects) {
		if (usedInHierarchy(record, inject.name)) continue;
		findings.push({
			file: record.file,
			className: record.name,
			name: inject.name,
			visibility: inject.visibility,
			line: inject.line,
			column: inject.column,
		});
	}
}

if (JSON_OUTPUT) {
	console.log(JSON.stringify(findings.map((f) => ({ ...f, file: relative(process.cwd(), f.file) })), null, 2));
	process.exit(findings.length > 0 ? 1 : 0);
}

if (findings.length === 0) {
	console.log(chalk.green.bold("No dead injects found."));
	process.exit(0);
}

console.log(chalk.bgRed.white.bold(` Found ${findings.length} dead inject(s) `));
console.log();

// Group findings per package for readability.
const packageOf = (file) => {
	const rel = relative(ROOT, file);
	return rel.split(/[/\\]/)[0];
};

const byPackage = new Map();
for (const f of findings) {
	const pkg = packageOf(f.file);
	if (!byPackage.has(pkg)) byPackage.set(pkg, []);
	byPackage.get(pkg).push(f);
}

// `path:line:column` is detected by VS Code's integrated terminal as a link —
// Ctrl/Cmd+click opens the file at the exact line and column.
for (const [pkg, items] of [...byPackage.entries()].sort()) {
	console.log(chalk.bold.underline(`@mainsail/${pkg}`));
	for (const f of items.sort(
		(a, b) => a.file.localeCompare(b.file) || a.line - b.line,
	)) {
		const location = `${relative(process.cwd(), f.file)}:${f.line}:${f.column}`;
		console.log(
			`  ${chalk.cyan(location)} ` +
				`${chalk.yellow(f.className)}.${chalk.red.bold(f.name)} ` +
				chalk.gray(`(${f.visibility})`),
		);
	}
	console.log();
}

process.exit(1);
