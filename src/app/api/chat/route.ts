import { streamText, type UIMessage, createDataStreamResponse, type LanguageModelV1 } from "ai";
import { modelDefs, tools, type Model, type Provider } from "./models";

export const maxDuration = 30;

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

    return createDataStreamResponse({
        execute: (dataStream) => {
            dataStream.writeMessageAnnotation({
                model: model,
            });

            const result = streamText({
                model: languageModel,
                providerOptions,
                messages,
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
