import { streamText, tool, type UIMessage, createProviderRegistry, customProvider, type LanguageModelV1, type ProviderRegistryProvider, createDataStreamResponse } from "ai";
import { openai, type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ProviderV1 } from "@ai-sdk/provider";

export const maxDuration = 30;

const modelConstructor = {
    openai: openai,
    anthropic: anthropic,
} as const;

export type Provider = keyof typeof modelConstructor;
type ModelClass = "default" | "smart";
export type Model = `${Provider}:${ModelClass}`;

export const modelDefs: Record<Provider, Record<ModelClass, string>> = {
    openai: {
        default: "gpt-4o",
        smart: "o3",
    },
    anthropic: {
        default: "claude-3-5-sonnet-20240620",
        smart: "claude-3-7-sonnet-20250219",
    },
};

export type ModelDefs = Record<Provider, Record<ModelClass, string>>;

const makeProviders = (providerObj: ModelDefs): {providers: ModelDefs, registry: ProviderRegistryProvider} => {
    const providers: ModelDefs = {} as ModelDefs;
    const registryConfig = {} as Record<Provider, ProviderV1>;
    
    for (const [provider, models] of Object.entries(providerObj) as [Provider, Record<ModelClass, string>][]) {
        const platformModels = {} as Record<ModelClass, string>;

        const languageModels = {} as Record<ModelClass, LanguageModelV1>;
        
        for (const [modelClass, name] of Object.entries(models) as [ModelClass, string][]) {
            platformModels[modelClass] = `${provider}:${name}`;

            providers[provider] = platformModels;
            languageModels[modelClass] = modelConstructor[provider](
                name
            ) as LanguageModelV1;
        }

        registryConfig[provider] = customProvider({
            languageModels,
        });
    }
    
    return { providers, registry: createProviderRegistry(registryConfig) };
};

export const { providers, registry } = makeProviders(modelDefs);

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

const providerOptions = {
    openai: {
        reasoningEffort: "high",
        reasoningSummary: "auto",
        parallelToolCalls: true,
    } satisfies OpenAIResponsesProviderOptions,
    anthropic: {
        thinking: { type: "enabled", budgetTokens: 12000 },
    } satisfies AnthropicProviderOptions,
};

export async function POST(req: Request) {
    const { messages, model } = await req.json() as { messages: UIMessage[], model: Model };

    return createDataStreamResponse({
        execute: (dataStream) => {
            const result = streamText({
                model: registry.languageModel(model),
                providerOptions,
                messages: messages.filter(m => m.content !== ""),
                tools,
                onFinish: () => {
                    dataStream.writeMessageAnnotation({
                        model: model,
                    });
                },
            });

            result.mergeIntoDataStream(dataStream, {
                sendReasoning: true,
            });
        },
        onError: (error) => {
            return error instanceof Error ? error.message : String(error);
        },
    });
}
