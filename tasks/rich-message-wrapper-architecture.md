# Canonical Message Format Architecture (Planned)

> **Status**: This document describes planned future work to improve message handling across different AI providers. The implementation has not yet been completed.

## Overview

Replace the current fragile message translation system with a robust **Canonical Message Format** that provides a single source of truth for all message handling, ensuring the AI SDK always receives the expected format regardless of provider.

## Current Problems

- **Fragile Translation**: Manual format conversion between providers is error-prone
- **Scattered Logic**: Provider-specific handling spread across components
- **Type Safety Issues**: Lots of `any` types and runtime property checks
- **Maintenance Burden**: Adding new providers requires touching multiple files
- **AI SDK Expectations**: The AI SDK expects reasoning parts to have a `details` array, but Anthropic sends `thinking` object

## Proposed Solution: Canonical Message Format

### Core Architecture

```typescript
// Our canonical format for message parts
export type CanonicalMessagePart = 
  | { type: 'text'; text: string }
  | { type: 'reasoning'; content: string; details: Array<{type: string; text?: string; data?: string; signature?: string}>; thinking?: {content: string; signature: string} }
  | { type: 'tool-invocation'; toolName: string; args: Record<string, unknown>; result?: unknown; state: string }
  | { type: 'file'; url: string; mediaType: string; filename?: string }
  | { type: 'source'; title: string; url: string; description?: string }
  | { type: 'step-start'; title: string; kind: string }
  | { type: 'unknown'; content: string };

// Our canonical message format
export interface CanonicalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  createdAt: Date;
  parts: CanonicalMessagePart[];
  annotations?: Array<Record<string, string>>;
  metadata?: Record<string, unknown>;
}
```

### Key Design Principles

The canonical format will:
- Provide a unified structure for all message parts
- Preserve all provider-specific data (OpenAI's `details`, Anthropic's `thinking`)
- Enable zero data loss during conversions
- Simplify client-side message handling

## Proposed Implementation

### Conversion Functions (src/lib/CanonicalMessage.ts)

```typescript
// Convert from UIMessage to our canonical format
export function toCanonicalMessage(uiMessage: UIMessage): CanonicalMessage {
  // ... conversion logic that ensures reasoning parts ALWAYS have details array
  
  // CRITICAL: Always ensure details array exists for AI SDK compatibility
  if (details.length === 0 && content) {
    details = [{
      type: 'text',
      text: content
    }];
  }
  
  parts.push({ type: 'reasoning', content, details, thinking });
}

// Convert from our canonical format to UIMessage for the AI SDK
export function toUIMessage(canonical: CanonicalMessage): UIMessage {
  // Always output in OpenAI format with details array for AI SDK compatibility
  parts.push({
    type: 'reasoning',
    reasoning: part.content,
    details: part.details || [{
      type: 'text',
      text: part.content
    }]
  });
}
```

### React Integration (src/app/_components/Chat.tsx)

```typescript
import { toCanonicalMessage, type CanonicalMessagePart } from "~/lib/CanonicalMessage";

const Message = forwardRef<HTMLDivElement, { message: UIMessage; reload: () => void; currentModel: Model }>(
  ({ message, reload, currentModel }, ref) => {
    // Convert to canonical format - this ensures all reasoning parts have details array
    const canonicalMessage = toCanonicalMessage(message);
    
    return (
      <div>
        {canonicalMessage.parts.map((part, index) => (
          <MessagePart
            key={`${message.id}-${index}`}
            part={part}
            numParts={canonicalMessage.parts.length}
          />
        ))}
      </div>
    );
  }
);

function MessagePart({ part, numParts }: { part: CanonicalMessagePart, numParts: number }) {
  switch (part.type) {
    case "text":
      return part.text;
    case "reasoning":
      return <Reasoning content={part.content} startExpanded={numParts <= 2} />;
    // ... other part types
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. **Canonical Message Types** (src/lib/CanonicalMessage.ts)
   - Define comprehensive type definitions covering all provider formats
   - Implement bidirectional conversion functions with zero data loss
   - Ensure proper handling of all message part types

### Phase 2: Client Integration  
2. **Chat Component Integration** (src/app/_components/Chat.tsx)
   - Update to use `toCanonicalMessage()` for all message rendering
   - Replace any direct message part access with canonical format
   - Ensure provider-agnostic message handling

### Phase 3: Server Integration
3. **Server-Side Handling** (src/app/api/chat/route.ts)
   - Preserve server-side translation for sending to AI providers
   - Add documentation explaining the flow
   - Consider future stream transformation if needed

### Expected Benefits

The error **"undefined is not an object (evaluating 'part.details')"** occurs because:
- Anthropic sends reasoning as `{thinking: {content}}` without a `details` array
- The AI SDK UI components expect `{details: Array}` to exist

The Canonical Format will solve this by:
- Providing a consistent structure regardless of source provider
- Preserving all provider-specific data without loss
- Enabling seamless provider switching

### Architecture Benefits

1. **Single Source of Truth**: One format for all message handling
2. **Provider Agnostic**: UI components won't need to know about provider differences  
3. **Future Proof**: Easy to add new providers by updating the converters
4. **Data Integrity**: All provider-specific data will be preserved
5. **Simplified Client Logic**: Components can rely on consistent message structure

## Future Considerations

- **Stream Transformation**: May need to handle streaming responses differently
- **Performance**: Consider lazy conversion for large message histories
- **Provider Extensions**: Design should accommodate future provider-specific features
- **Type Safety**: Ensure comprehensive TypeScript coverage for all conversions

This architecture will provide a robust foundation for handling multi-provider message formats while maintaining clean separation of concerns and excellent developer experience.
