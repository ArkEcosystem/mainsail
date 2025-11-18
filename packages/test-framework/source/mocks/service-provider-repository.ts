import type { Providers } from "@mainsail/kernel";

let mockServiceProviders: Providers.ServiceProvider[] = [];

class ServiceProviderRepositoryMocks implements Partial<Providers.ServiceProviderRepository> {
	public allLoadedProviders(): Providers.ServiceProvider[] {
		return mockServiceProviders;
	}
}

export const setServiceProviders = (serviceProviders: Providers.ServiceProvider[]) => {
	mockServiceProviders = serviceProviders;
};

export const instance = new ServiceProviderRepositoryMocks();
