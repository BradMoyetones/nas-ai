import type {
    ModelIconContext,
    ModelFamilyId,
} from "./types";

import {
    modelFamilies,
} from "./model-families";

export function identifyModel(
    modelId: string,
): Pick<ModelIconContext, "owner" | "family"> {

    for (
        const familyId of Object.keys(modelFamilies) as ModelFamilyId[]
    ) {

        const family = modelFamilies[familyId];

        if (
            family.patterns.some(
                pattern => pattern.test(modelId),
            )
        ) {
            return {
                owner: family.owner,
                family: family.id,
            };
        }
    }

    return {};
}