import { streamText, type UIMessage, createDataStreamResponse, type LanguageModelV1 } from "ai";
import { modelDefs, tools, type Model, type Provider } from "./models";

export const maxDuration = 30;

// Helper function to check if an annotation has a model property
function hasModelProperty(annotation: unknown): annotation is { model: string } {
    return (
        annotation !== null &&
        typeof annotation === 'object' &&
        'model' in annotation &&
        typeof (annotation as { model: unknown }).model === 'string'
    );
}

// Helper function to filter incompatible reasoning parts from messages
function filterIncompatibleReasoning(messages: UIMessage[], targetProvider: Provider): UIMessage[] {
    return messages.map(message => {
        if (message.role === "user") {
            // User messages don't have reasoning parts, return as-is
            return message;
        }

        // For assistant messages, filter out reasoning parts from different providers
        const filteredParts = message.parts.filter(part => {
            if (part.type === "reasoning") {
                // Get the model annotation from the message to determine the original provider
                const annotations = message.annotations || [];
                const modelAnnotation = annotations.find(hasModelProperty);
                
                if (modelAnnotation) {
                    const originalProvider = modelAnnotation.model.split(':')[0] as Provider;
                    // Only keep reasoning parts from the same provider
                    return originalProvider === targetProvider;
                }
                
                // If we can't determine the original provider, err on the side of caution and remove the reasoning
                return false;
            }
            
            // Keep all non-reasoning parts (text, tool-invocation, etc.)
            return true;
        });

        return {
            ...message,
            parts: filteredParts
        };
    });
}

export async function POST(req: Request) {
    const { messages, model } = await req.json() as { messages: UIMessage[], model: Model };

    const [provider, modelClass] = model.split(':') as [Provider, keyof typeof modelDefs[Provider]['models']];
    const providerConfig = modelDefs[provider];
    const modelConfig = providerConfig.models[modelClass];
    const modelName = modelConfig.name;

    const factory = modelConfig.factory || providerConfig.factory;

    const languageModel: LanguageModelV1 = factory(modelName);

    const providerOptions = modelConfig.reasoning
        ? {
              [provider]: providerConfig.reasoningOptions,
          }
        : {};

    // Filter out incompatible reasoning parts to prevent schema validation errors
    const filteredMessages = filterIncompatibleReasoning(messages, provider);

    return createDataStreamResponse({
        execute: (dataStream) => {
            dataStream.writeMessageAnnotation({
                model: model,
            });

            const result = streamText({
                model: languageModel,
                providerOptions,
                messages: filteredMessages,
                tools,
                onFinish: (result) => {
                    console.log("Stream finished with result:", {
                        model,
                        hasReasoning: !!result.reasoning,
                        reasoningLength: result.reasoning?.length || 0,
                        finishReason: result.finishReason,
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
