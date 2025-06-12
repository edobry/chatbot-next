# Incremental Persistence Architecture

## Philosophy
Start with the minimal persistence approach and grow incrementally as needs arise. Avoid over-engineering - add features only when actually needed.

## Growth Path

### Phase 1: Basic Persistence (Immediate - from minimal design)
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
  role VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  raw_message JSONB NOT NULL,  -- Full UIMessage in original format
  content_text TEXT,           -- For basic display
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX(conversation_id, created_at),
  INDEX(provider)
);
```

**Core Functions:**
- Save/load conversations with schema mapping
- Basic conversation management (create, list, delete)
- Reasoning continuity across provider switches

### Phase 2: Flexible Metadata (When you need custom data)
Add metadata columns for extensibility:

```sql
-- Add to conversations table when you need conversation-level settings
ALTER TABLE conversations ADD COLUMN metadata JSONB;

-- Add to messages table when you need message-level data  
ALTER TABLE messages ADD COLUMN metadata JSONB;
```

**Example usage:**
```typescript
// Store whatever you need without schema changes
metadata: {
  custom_setting: "value",
  user_preference: true,
  anything_else: { complex: "data" }
}
```

### Phase 3: Multi-Modal Support (When you add images/audio/video)
```sql
-- Only add when actually implementing multi-modal
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  metadata JSONB NOT NULL, -- file_path, mime_type, size, analysis results
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Key Principles

### 1. Store Original, Map on Load
Always store messages in their original provider format:
```typescript
// Store
await saveMessage(conversationId, openaiResponse, "openai", "o3");

// Load and map when switching providers
const messages = await loadConversation(conversationId, "anthropic");
```

### 2. Use JSONB for Flexibility
Don't create explicit columns until you have clear query patterns:
```typescript
// Good - flexible
metadata: { 
  tokens: 150, 
  custom_field: "whatever" 
}

// Bad - rigid schema that's hard to change
CREATE TABLE message_metrics (
  token_count INTEGER,
  confidence DECIMAL,
  -- What if you need a new field?
);
```

### 3. Incremental Schema Changes
Add fields only when you have actual requirements:
```sql
-- When you actually need user management
ALTER TABLE conversations ADD COLUMN user_id UUID;

-- When you actually need conversation sharing
ALTER TABLE conversations ADD COLUMN sharing_settings JSONB;
```

## Data Layer Evolution

### Simple Start
```typescript
interface StoredMessage {
  id: string;
  conversation_id: string;
  role: string;
  provider: string;
  model: string;
  raw_message: UIMessage;
  content_text: string;
  created_at: Date;
}
```

### Natural Growth
```typescript
interface StoredMessage {
  id: string;
  conversation_id: string;
  role: string;
  provider: string;
  model: string;
  raw_message: UIMessage;
  content_text: string;
  created_at: Date;
  
  // Add when needed
  metadata?: Record<string, any>;
}
```

## Translation Layer Growth

### Start Simple
```typescript
function translateMessage(message: UIMessage, targetProvider: Provider): UIMessage {
  // Basic OpenAI ↔ Anthropic reasoning mapping
}
```

### Grow Incrementally
```typescript
class ReasoningTranslator {
  // Add new providers as needed
  translate(message: UIMessage, from: Provider, to: Provider): UIMessage {
    if (this.hasDirectMapping(from, to)) {
      return this.directTranslate(message, from, to);
    }
    
    // Fallback to canonical format if no direct mapping
    return this.viaCanonical(message, from, to);
  }
  
  // Add when you have multiple reasoning providers
  private hasDirectMapping(from: Provider, to: Provider): boolean {
    return this.supportedPairs.has(`${from}->${to}`);
  }
}
```

## Benefits of Incremental Approach

✅ **Start shipping immediately**: Basic functionality works from day 1  
✅ **Learn from usage**: Add features based on actual needs, not speculation  
✅ **Lower complexity**: Simpler codebase is easier to maintain  
✅ **Flexible growth**: JSONB allows schema evolution without migrations  
✅ **Cost effective**: Don't pay for unused features  

## When to Add Each Phase

- **Phase 2 (Metadata)**: When you need to store custom data beyond basic messages
- **Phase 3 (Multi-modal)**: When you actually implement image/audio support

## Anti-Patterns to Avoid

❌ **Over-engineering upfront**: Don't build features "just in case"  
❌ **Premature optimization**: Don't add caching/indexing until you need it  
❌ **Rigid schemas**: Don't create explicit columns for every possible field  
❌ **Complex abstractions**: Don't build translation layers until you have 3+ providers  

This approach lets you ship the minimal solution quickly while keeping all options open for future growth.
