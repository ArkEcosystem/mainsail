import { Commands } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import Joi from "joi";
import ngrok from "ngrok";

@injectable()
export class Command extends Commands.Command {
	public signature = "relay:share";

	public description = "Share the Relay via ngrok.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition
			.setFlag("proto", "Choose one of the available protocols (http|tcp|tls).", Joi.string().default("http"))
			.setFlag("addr", "Port or network address.", Joi.string().default(4003))
			.setFlag("auth", "HTTP basic authentication for tunnel.", Joi.string())
			.setFlag("subdomain", "Reserved tunnel name https://core.ngrok.io.", Joi.string())
			.setFlag("authtoken", "Your authtoken from ngrok.com.", Joi.string())
			.setFlag("region", "Choose one of the ngrok regions (us|eu|au|ap).", Joi.string().default("eu"));
	}

	public async execute(): Promise<void> {
		const url: string = await ngrok.connect({
			addr: this.getFlag("addr"),
			auth: this.getFlag("auth"),
			authtoken: this.getFlag("authtoken"),
			proto: this.getFlag("proto"),
			region: this.getFlag("region"),
			subdomain: this.getFlag("subdomain"),
		});

		this.components.info(`Public access to your API: ${url}`);
	}
}
