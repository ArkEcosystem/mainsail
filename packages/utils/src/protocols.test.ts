import { protocols } from "./protocols";

describe("#protocols", () => {
	it("should return all protocols of the given URL", () => {
		expect(protocols("git+ssh://git@host.com/owner/repo")).toEqual(["git", "ssh"]);
		expect(protocols("http://google.com/")).toEqual(["http"]);
		expect(protocols("https://google.com/")).toEqual(["https"]);
	});
});
