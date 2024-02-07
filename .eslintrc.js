module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "tsconfig.eslint.json",
		extraFileExtensions: [".json"],
		projectFolderIgnoreList: ["build", "coverage", "node_modules", "public"],
	},
	plugins: [
		"@typescript-eslint",
		"prettier",
		"promise",
		"simple-import-sort",
		"sonarjs",
		"sort-keys-fix",
		"testing-library",
		"unicorn",
		"unused-imports",
	],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		"plugin:@typescript-eslint/recommended",
		"plugin:import/errors",
		"plugin:import/typescript",
		"plugin:import/warnings",
		"plugin:prettier/recommended",
		"plugin:promise/recommended",
		"plugin:sonarjs/recommended",
		"plugin:unicorn/recommended",
		"prettier",
	],
	rules: {
		"@typescript-eslint/ban-ts-comment": "off",
		"@typescript-eslint/ban-types": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/naming-convention": "off",
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-empty-interface": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-misused-promises": "off",
		"@typescript-eslint/no-non-null-asserted-optional-chain": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-unsafe-argument": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"@typescript-eslint/no-unsafe-call": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-return": "off",
		"@typescript-eslint/no-unused-vars": "off",
		"@typescript-eslint/no-unnecessary-type-assertion": "off",
		"@typescript-eslint/no-var-requires": "off",
		"@typescript-eslint/require-await": "off",
		"@typescript-eslint/restrict-plus-operands": "off",
		"@typescript-eslint/restrict-template-expressions": "off",
		"@typescript-eslint/no-unsafe-enum-comparison": "off",
		"@typescript-eslint/no-base-to-string": "warn",
		"@typescript-eslint/no-redundant-type-constituents": "warn",
		"arrow-body-style": ["warn", "as-needed"],
		curly: "warn",
		"import/default": "warn",
		"import/export": "warn",
		"import/exports-last": "warn",
		// "import/extensions": ["warn", "always"],
		"import/extensions": "off",
		"import/first": "warn",
		"import/group-exports": "off",
		"import/namespace": "warn",
		"import/no-absolute-path": "warn",
		"import/no-anonymous-default-export": "warn",
		"import/no-cycle": "error",
		"import/no-deprecated": "warn",
		"import/no-duplicates": "warn",
		"import/no-dynamic-require": "off",
		"import/no-extraneous-dependencies": "warn",
		"import/no-mutable-exports": "warn",
		"import/no-namespace": "warn",
		"import/no-restricted-paths": "warn",
		"import/no-self-import": "warn",
		"import/no-unresolved": "off",
		"import/no-unused-modules": "warn",
		"import/no-useless-path-segments": "warn",
		"import/no-webpack-loader-syntax": "warn",
		"no-async-promise-executor": "off",
		"no-prototype-builtins": "off",
		"no-nested-ternary": "warn",
		"no-unneeded-ternary": "warn",
		"no-unused-expressions": "off",
		"no-unused-vars": "off",
		"prefer-const": [
			"warn",
			{
				destructuring: "all",
			},
		],
		"prettier/prettier": [
			"off",
			{
				endOfLine: "auto",
			},
		],
		"promise/param-names": "warn",
		"simple-import-sort/exports": "error",
		"simple-import-sort/imports": "warn",
		"sonarjs/cognitive-complexity": "warn",
		"sonarjs/no-all-duplicated-branches": "warn",
		"sonarjs/no-collapsible-if": "warn",
		"sonarjs/no-duplicate-string": "off",
		"sonarjs/no-identical-expressions": "warn",
		"sonarjs/no-identical-functions": "warn",
		"sonarjs/no-redundant-jump": "warn",
		"sonarjs/no-small-switch": "warn",
		"sonarjs/no-use-of-empty-return-value": "warn",
		"sort-keys-fix/sort-keys-fix": [
			"warn",
			"asc",
			{
				caseSensitive: true,
			},
		],
		"unicorn/consistent-destructuring": "warn",
		"unicorn/consistent-function-scoping": "warn",
		"unicorn/error-message": "warn",
		"unicorn/explicit-length-check": "warn",
		"unicorn/filename-case": "warn",
		"unicorn/import-style": "warn",
		"unicorn/no-abusive-eslint-disable": "warn",
		"unicorn/no-array-callback-reference": "warn",
		"unicorn/no-array-for-each": "warn",
		"unicorn/no-array-method-this-argument": "warn",
		"unicorn/no-array-reduce": "warn",
		"unicorn/no-await-expression-member": "warn",
		"unicorn/no-new-array": "warn",
		"unicorn/no-null": "warn",
		"unicorn/no-object-as-default-parameter": "warn",
		"unicorn/no-useless-undefined": "warn",
		"unicorn/prefer-array-some": "warn",
		"unicorn/prefer-at": "warn",
		"unicorn/prefer-module": "warn",
		"unicorn/prefer-node-protocol": "off",
		"unicorn/prefer-number-properties": "warn",
		"unicorn/prefer-prototype-methods": "warn",
		"unicorn/prefer-spread": "warn",
		"unicorn/prefer-string-slice": "warn",
		"unicorn/prefer-ternary": "off",
		"unicorn/prefer-top-level-await": "warn",
		"unicorn/prevent-abbreviations": "warn",
		"unused-imports/no-unused-imports-ts": "warn",
		"unicorn/prefer-object-from-entries": "warn",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/await-thenable": "warn",
		"@typescript-eslint/unbound-method": "warn",
		"promise/always-return": "warn",
		"unicorn/prefer-default-parameters": "warn",
		"unicorn/no-typeof-undefined": "warn",
		"unicorn/prefer-add-event-listener": "warn",
		"unicorn/switch-case-braces": "warn",
		"no-empty": "warn",
		"sonarjs/no-nested-template-literals": "warn",
		"sonarjs/prefer-single-boolean-return": "off",
		"unicorn/require-number-to-fixed-digits-argument": "off",
		"unicorn/prefer-logical-operator-over-ternary": "off",
		"unicorn/no-negated-condition": "off",
		"unicorn/no-thenable": "off",
		"unicorn/prefer-event-target": "warn",
	},
};
