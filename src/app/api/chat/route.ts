import { streamText, type UIMessage, createDataStreamResponse, type LanguageModelV1 } from "ai";
import { modelDefs, registry, tools, getProviderOptions, type Model, type Provider } from "./models";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, model } = await req.json() as { messages: UIMessage[], model: Model };

    const [provider, modelClass] = model.split(':') as [Provider, keyof typeof modelDefs[Provider]['models']];
    const providerConfig = modelDefs[provider];
    const modelConfig = providerConfig.models[modelClass];
    const modelName = modelConfig.name;

    // Get the appropriate language model based on whether it needs reasoning
    let languageModel: LanguageModelV1;
    if (provider === 'openai' && modelConfig.reasoning) {
        // Use responses API for reasoning models
        languageModel = (providerConfig.constructor as typeof import("@ai-sdk/openai").openai).responses(modelName);
    } else {
        // Use standard registry lookup
        languageModel = registry.languageModel(`${provider}:${modelName}`);
    }

    // Get provider options only if the model has reasoning enabled
    const providerOptions = getProviderOptions(model);

    // Debug logging
    console.log('Looking up model:', model);
    console.log('Model name:', modelName);
    console.log('Found language model:', languageModel);
    console.log('Model has doStream:', typeof languageModel?.doStream);

    return createDataStreamResponse({
        execute: (dataStream) => {
            const result = streamText({
                model: languageModel,
                providerOptions,
                messages: messages.filter(m => m.content !== ""),
                tools,
                onFinish: (result) => {
                    console.log("Stream finished with result:", {
                        model,
                        hasReasoning: !!result.reasoning,
                        reasoningLength: result.reasoning?.length || 0,
                        finishReason: result.finishReason,
                    });
                    
                    dataStream.writeMessageAnnotation({
                        model: model,
                    });
                },
            });

            result.mergeIntoDataStream(dataStream, {
                sendReasoning: true,
                sendSources: true,
            });
        },
        onError: (error) => {
            return error instanceof Error ? error.message : String(error);
        },
    });
}
