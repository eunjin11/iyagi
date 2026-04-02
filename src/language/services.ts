import { inject, type Module } from "langium";
import type {
	DefaultSharedModuleContext,
	LangiumServices,
	LangiumSharedServices,
	PartialLangiumServices,
} from "langium/lsp";
import { createDefaultModule, createDefaultSharedModule } from "langium/lsp";
import {
	IyagiGeneratedModule,
	iyagiGeneratedSharedModule,
} from "./__generated__/module.js";

export type IyagiServices = LangiumServices;

export const IyagiModule: Module<IyagiServices, PartialLangiumServices> = {};

export function createIyagiServices(context: DefaultSharedModuleContext): {
	shared: LangiumSharedServices;
	Iyagi: IyagiServices;
} {
	const shared = inject(
		createDefaultSharedModule(context),
		iyagiGeneratedSharedModule,
	);

	const Iyagi = inject(
		createDefaultModule({ shared }),
		IyagiGeneratedModule,
		IyagiModule,
	);

	shared.ServiceRegistry.register(Iyagi);
	return { shared, Iyagi };
}
