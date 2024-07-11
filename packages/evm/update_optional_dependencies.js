const fs = require("fs");

// Read the existing package.json file
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const version = packageJson.version;
for (const key in packageJson.optionalDependencies) {
	packageJson.optionalDependencies[key] = version;
}

// Write the updated content back to package.json
fs.writeFileSync("package.json", JSON.stringify(packageJson, null, "\t"), "utf8");
