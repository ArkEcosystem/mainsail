const fs = require("fs");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

packageJson.optionalDependencies = {
	"@mainsail/evm-linux-arm64-gnu": packageJson.version,
	"@mainsail/evm-linux-x64-gnu": packageJson.version,
};

fs.writeFileSync("package.json", JSON.stringify(packageJson, null, "\t"), "utf8");
