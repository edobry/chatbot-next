import { createProviderRegistry, type LanguageModelV1, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

type ModelClass = "default" | "smart";

// Model name constants
export const MODEL_NAMES = {
    OPENAI: {
        GPT_4O: "gpt-4o",
        O3: "o3",
    },
    ANTHROPIC: {
        CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20240620",
        CLAUDE_3_7_SONNET: "claude-3-7-sonnet-20250219",
    },
} as const;

export const modelDefs = {
    openai: {
        constructor: openai,
        reasoningOptions: {
            reasoningEffort: "high" as const,
            reasoningSummary: "detailed" as const,
            parallelToolCalls: true,
        },
        models: {
            default: {
                name: MODEL_NAMES.OPENAI.GPT_4O,
                reasoning: false,
            },
            smart: {
                name: MODEL_NAMES.OPENAI.O3,
                reasoning: true,
                constructor: openai.responses,
            },
        }
    },
    anthropic: {
        constructor: anthropic,
        reasoningOptions: {
            thinking: { type: "enabled" as const, budgetTokens: 12000 },
        },
        models: {
            default: {
                name: MODEL_NAMES.ANTHROPIC.CLAUDE_3_5_SONNET,
                reasoning: false,
            },
            smart: {
                name: MODEL_NAMES.ANTHROPIC.CLAUDE_3_7_SONNET,
                reasoning: true,
            },
        }
    }
} as const;

export type Provider = keyof typeof modelDefs;
export type Model = `${Provider}:${ModelClass}`;
export type ModelDefs = Record<Provider, Record<ModelClass, string>>;

// Create simple registry with standard providers
export const registry = createProviderRegistry({
    openai,
    anthropic,
});

// Function to generate providers object from modelDefs
export const generateProviders = (): ModelDefs => {
    const providers: ModelDefs = {} as ModelDefs;
    
    for (const [provider, config] of Object.entries(modelDefs) as [Provider, typeof modelDefs[Provider]][]) {
        const platformModels = {} as Record<keyof typeof config.models, string>;
        
        for (const [modelClass, modelConfig] of Object.entries(config.models)) {
            platformModels[modelClass as keyof typeof config.models] = modelConfig.name;
        }
        
        providers[provider] = platformModels;
    }
    
    return providers;
};

// Helper function to get provider options for a specific model
export const getProviderOptions = (model: Model) => {
    const [provider, modelClass] = model.split(':') as [Provider, ModelClass];
    const providerConfig = modelDefs[provider];
    const modelConfig = providerConfig.models[modelClass];
    
    // Only return reasoning options if the model has reasoning enabled
    if (modelConfig.reasoning) {
        return {
            [provider]: providerConfig.reasoningOptions,
        };
    }
    
    return undefined;
};

export const tools = {
    random: tool({
        description: "Generate a random number within limits",
        parameters: z.object({
            min: z.number(),
            max: z.number(),
        }),
        execute: async ({ min, max }) => {
            console.log("Executing random tool", { min, max });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
    }),
}; 
