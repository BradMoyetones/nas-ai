import type { AIProviderId } from '@nas/shared';

export class ProviderApiError extends Error {
    readonly provider: AIProviderId;
    readonly status?: number;
    readonly providerCode?: string;
    readonly requestId?: string;

    constructor(params: {
        provider: AIProviderId;
        message: string;
        status?: number;
        providerCode?: string;
        requestId?: string;
        cause?: unknown;
    }) {
        super(params.message);

        this.name = 'ProviderApiError';

        this.provider = params.provider;
        this.status = params.status;
        this.providerCode = params.providerCode;
        this.requestId = params.requestId;

        if (params.cause !== undefined) {
            this.cause = params.cause;
        }
    }
}