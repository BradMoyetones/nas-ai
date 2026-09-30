import type {
    ModelIconContext,
    ResolvedIcon,
} from "./types";
import {
    iconRegistry,
} from "./registry";
import {
    modelFamilies,
} from "./model-families";
import {
    products,
} from "./products";
import {
    organizations,
} from "./organizations";
import {
    providers,
} from "./providers";

export function resolveModelIcon(
    model: Partial<ModelIconContext>,
): ResolvedIcon {

    if (model.product) {

        const product = products[model.product];

        if (product) {
            return {
                component: iconRegistry[product.icon],
                key: product.icon,
                source: "product",
            };
        }
    }

    if (model.family) {

        const family = modelFamilies[model.family];

        if (family) {
            return {
                component: iconRegistry[family.icon],
                key: family.icon,
                source: "family",
            };
        }
    }

    if (model.owner) {

        const organization = organizations[model.owner];

        if (organization) {
            return {
                component: iconRegistry[organization.icon],
                key: organization.icon,
                source: "organization",
            };
        }
    }

    const provider = providers[model.provider as keyof typeof providers];

    if (provider) {
        return {
            component: iconRegistry[provider.icon as keyof typeof iconRegistry],
            key: provider.icon,
            source: "provider",
        };
    }

    return {
        component: iconRegistry.openai,
        key: "openai",
        source: "fallback",
    };
}