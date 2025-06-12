# Minimal Reasoning Compatibility + Simple Persistence

## Problem
When switching from OpenAI reasoning models (o3) to Anthropic reasoning models (Claude 3.7 Sonnet), getting schema validation error:
```
"messages.3.content.0.thinking.signature: Field required"
```

This prevents seamless model switching mid-conversation while preserving reasoning context.

## Goal
- Fix immediate schema compatibility issue
- Add simple persistence that preserves original provider formats
- Enable incremental growth without complex architecture

## Solution: Store Original + Map on Inference

### Core Strategy
1. **Store messages in their original provider format** (preserve maximum fidelity)
2. **Map schemas on-the-fly during inference** when switching providers
3. **Use JSONB for flexibility** instead of rigid schemas

### Database Schema (Minimal)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  
  -- Store original message format (no information loss)
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  raw_message JSONB NOT NULL,  -- Full UIMessage in original format
  
  -- Basic content for search/display (denormalized for performance)
  content_text TEXT, -- Main response text for search
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX(conversation_id, created_at),
  INDEX(provider) -- For provider-specific queries
);
```

### Implementation

#### 1. Schema Mapping (same as before)
```typescript
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

function translateReasoningPart(part: any, targetProvider: Provider): any {
  if (part.type !== "reasoning") return part;
  
  if (targetProvider === "anthropic") {
    return {
      type: "reasoning",
      thinking: {
        signature: part.details?.[0]?.signature || "translated-from-openai",
        content: part.reasoning || extractTextFromDetails(part.details)
      }
    };
  } else if (targetProvider === "openai") {
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
```

#### 2. Persistence Layer (Simple)
```typescript
// Simple persistence functions
async function saveMessage(conversationId: string, message: UIMessage, provider: string, model: string) {
  const contentText = extractMainContent(message);
  
  await db.insert(messages).values({
    conversation_id: conversationId,
    role: message.role,
    provider,
    model, 
    raw_message: message, // Store original format
    content_text: contentText
  });
}

async function loadConversation(conversationId: string, targetProvider: Provider): Promise<UIMessage[]> {
  const storedMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.created_at));
  
  // Map to target provider format on load
  return storedMessages.map(stored => 
    translateMessage(stored.raw_message, targetProvider)
  );
}

function extractMainContent(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join(" ");
}
```

#### 3. Updated API Route
```typescript
export async function POST(req: Request) {
    const { messages, model, conversationId } = await req.json() as { 
      messages: UIMessage[], 
      model: Model,
      conversationId?: string 
    };

    const [provider, modelClass] = model.split(':') as [Provider, keyof typeof modelDefs[Provider]['models']];
    
    // Load persisted conversation if continuing existing chat
    let allMessages = messages;
    if (conversationId) {
      const persistedMessages = await loadConversation(conversationId, provider);
      allMessages = [...persistedMessages, ...messages];
    }
    
    // Translate reasoning for current provider
    const translatedMessages = allMessages.map(msg => translateMessage(msg, provider));

    return createDataStreamResponse({
        execute: async (dataStream) => {
            const result = streamText({
                model: languageModel,
                providerOptions,
                messages: translatedMessages,
                tools,
                onFinish: async (result) => {
                    // Persist assistant response in original format
                    if (conversationId && result.response) {
                      await saveMessage(conversationId, result.response, provider, model);
                    }
                },
            });
            
            result.mergeIntoDataStream(dataStream);
        },
    });
}
```

## Benefits of This Approach

✅ **No information loss**: Original provider formats preserved  
✅ **Flexible mapping**: Can improve translation logic over time  
✅ **Simple schema**: Uses JSONB for extensibility  
✅ **Incremental growth**: Easy to add fields as needed  
✅ **Performance**: Denormalized content_text for search  

## Implementation Steps

1. **Add basic schema mapping** to fix immediate error
2. **Add simple database schema** with JSONB storage
3. **Implement save/load functions** with translation
4. **Test OpenAI ↔ Anthropic** reasoning continuity
5. **Add conversation management** (create, list, etc.)

## Future Growth Path

- Add `metadata JSONB` column for conversation-level settings
- Add `attachments JSONB` column when multi-modal support needed
- Add analytics fields (`token_usage JSONB`, `latency_ms`) when metrics needed
- Add search capabilities using `content_text` column

This approach gives you persistence immediately while preserving all original data for future enhancements.
