# Tasks Directory

This directory contains implementation plans for the chatbot project in order of priority.

## Implementation Order

### 1. `immediate-schema-mapping.md`
**Priority: Do This First**

Fixes the immediate schema validation error when switching between OpenAI and Anthropic reasoning models. Addresses this error:
```
"messages.3.content.0.thinking.signature: Field required"
```

**Goal**: Schema translation so you can switch between `openai:smart` and `anthropic:smart` without errors, preserving reasoning context.

**Scope**: Just the mapping logic - no persistence, no complex architecture.

### 2. `minimal-reasoning-compatibility.md` 
**Priority: After schema mapping works**

Adds basic persistence to the schema mapping approach. Stores messages in original provider formats and maps on load.

**Goal**: Persistent conversations with reasoning continuity across provider switches.

**Scope**: Simple database schema + save/load functions using the schema mapping from step 1.

### 3. `incremental-persistence-architecture.md`
**Priority: Future Reference**

How to grow the minimal persistence design when you actually need more features.

**Goal**: Roadmap for extending the system without over-engineering upfront.

**Scope**: Just metadata JSONB and multi-modal attachments - only when actually needed.

## Current Status

- [ ] Immediate schema mapping (fixes the error)
- [ ] Basic persistence (saves conversations) 
- [ ] Future enhancements (when needed)

## The Flow

1. **Fix the immediate error** with schema mapping
2. **Add basic persistence** when conversations need to be saved
3. **Reference incremental doc** only when you hit real limitations

 
