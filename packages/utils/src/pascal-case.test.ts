import "jest-extended";

import { pascalCase } from "./pascal-case";

describe("#pascalCase", () => {
    it("should turn any string into pascal case", () => {
        expect(pascalCase("string")).toBe("String");
        expect(pascalCase("camelCase")).toBe("CamelCase");
        expect(pascalCase("param-case")).toBe("ParamCase");
        expect(pascalCase("PascalCase")).toBe("PascalCase");
        expect(pascalCase("UPPER_CASE")).toBe("UpperCase");
        expect(pascalCase("snake_case")).toBe("SnakeCase");
        expect(pascalCase("sentence case")).toBe("SentenceCase");
        expect(pascalCase("Title Case")).toBe("TitleCase");
        expect(pascalCase("dot.case")).toBe("DotCase");
    });
});
