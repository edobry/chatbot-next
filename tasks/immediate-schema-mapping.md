# Immediate Schema Mapping Fix

## Problem
When switching from `openai:smart` to `anthropic:smart`, getting error:
```
"messages.3.content.0.thinking.signature: Field required"
```

This happens because OpenAI and Anthropic use different schemas for reasoning data.

## Goal
Fix the immediate error so you can switch between reasoning models mid-conversation without losing reasoning context.

## Solution: Simple Schema Translation

### 1. Understand the Schemas

**OpenAI reasoning format:**
```typescript
{
  type: "reasoning",
  reasoning: string,
  details: [{
    type: "text",
    text: string,
    signature?: string  // Optional
  }]
}
```

**Anthropic reasoning format:**
```typescript
{
  type: "reasoning", 
  thinking: {
    signature: string,  // Required!
    content: string
  }
}
```

### 2. Implementation

Replace the current filtering logic in `src/app/api/chat/route.ts`:

```typescript
// Helper to detect original provider from message annotations
function getOriginalProvider(message: UIMessage): Provider | null {
  const annotations = message.annotations || [];
  const modelAnnotation = annotations.find(hasModelProperty);
  return modelAnnotation ? modelAnnotation.model.split(':')[0] as Provider : null;
}

// Schema translation functions
function translateReasoningPart(part: any, targetProvider: Provider): any {
  if (part.type !== "reasoning") return part;
  
  if (targetProvider === "anthropic") {
    // OpenAI → Anthropic
    return {
      type: "reasoning",
      thinking: {
        signature: part.details?.[0]?.signature || "translated-from-openai",
        content: part.reasoning || extractTextFromDetails(part.details)
      }
    };
  } else if (targetProvider === "openai") {
    // Anthropic → OpenAI
    return {
      type: "reasoning",
      reasoning: part.thinking?.content || "",
      details: [{
        type: "text",
        text: part.thinking?.content || "",
        signature: part.thinking?.signature || "translated-from-anthropic"
      }]
    };
  }
  
  return part;
}

function extractTextFromDetails(details: any[]): string {
  if (!details) return "";
  return details
    .map(detail => detail.text || detail.data || "")
    .join("\n");
}

function translateMessage(message: UIMessage, targetProvider: Provider): UIMessage {
  const sourceProvider = getOriginalProvider(message);
  
  if (!sourceProvider || sourceProvider === targetProvider) {
    return message; // No translation needed
  }
  
  // Translate reasoning parts
  const translatedParts = message.parts.map(part => 
    translateReasoningPart(part, targetProvider)
  );
  
  return { ...message, parts: translatedParts };
}
```

### 3. Update the API Route

In `src/app/api/chat/route.ts`, replace the existing filtering logic:

```typescript
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

    // Translate reasoning schemas instead of filtering
    const translatedMessages = messages.map(msg => translateMessage(msg, provider));

    return createDataStreamResponse({
        execute: (dataStream) => {
            dataStream.writeMessageAnnotation({
                model: model,
            });

            const result = streamText({
                model: languageModel,
                providerOptions,
                messages: translatedMessages, // Use translated messages
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
```

## Testing

1. Start conversation with `openai:smart`
2. Ask question that generates reasoning
3. Switch to `anthropic:smart` 
4. Continue conversation - should work without errors
5. Switch back to `openai:smart`
6. Verify reasoning continuity in both directions

## Success Criteria

✅ No schema validation errors when switching providers  
✅ Reasoning context preserved across switches  
✅ Models can reference and build on previous reasoning  
✅ Works in both directions (OpenAI ↔ Anthropic)  

## What This Gives You

- **Immediate fix** for the schema error
- **Reasoning continuity** across provider switches  
- **Foundation** for future persistence (messages are already compatible)
- **Simple solution** - just ~50 lines of mapping code

Once this works, you can add persistence on top using the stored original formats + mapping approach from the other docs. 
