# Rich Message Wrapper Architecture

## Overview

Replace the current fragile message translation system with a robust `RichMessage` wrapper class that provides a clean, provider-agnostic interface while preserving raw message data for wire transfer.

## Current Problems

- **Fragile Translation**: Manual format conversion between providers is error-prone
- **Scattered Logic**: Provider-specific handling spread across components
- **Type Safety Issues**: Lots of `any` types and runtime property checks
- **Maintenance Burden**: Adding new providers requires touching multiple files
- **Performance Overhead**: Preemptive translation of all messages

## Proposed Solution

### Core Architecture

```typescript
class RichMessage {
  private readonly rawMessage: UIMessage;
  private readonly detectedProvider: Provider | null;
  private readonly explicitProvider?: Provider;
  
  constructor(message: UIMessage, provider?: Provider) {
    this.rawMessage = message;
    this.explicitProvider = provider;
    this.detectedProvider = this.detectProvider();
  }
  
  // Core access methods for UI
  getParts(): NormalizedPart[]
  
  // Metadata access
  getProvider(): Provider
  getModel(): string | null
  
  // Serialization
  toRaw(): UIMessage
  static fromRaw(message: UIMessage, provider: Provider): RichMessage
}
```

### Core Interface

```typescript
// Normalized part types (provider-agnostic)
type NormalizedPart = 
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string }
  | { type: 'tool-invocation'; toolName: string; args: Record<string, unknown>; result?: unknown; state: string }
  | { type: 'unknown'; content: string }
```

## Implementation

```typescript
// src/lib/RichMessage.ts

// Provider-specific content extractors
const providerExtractors = {
  openai: {
    reasoning: (part: any): string => {
      return part.details
        ?.map((detail: any) => detail.type === 'text' ? detail.text : detail.data)
        ?.join('\n') || part.reasoning || '';
    }
  },
  anthropic: {
    reasoning: (part: any): string => {
      return part.thinking?.content || '';
    }
  }
} as const;

export class RichMessage {
  private constructor(
    private readonly rawMessage: UIMessage,
    private readonly provider: Provider
  ) {}
  
  static fromRaw(message: UIMessage, provider: Provider): RichMessage {
    return new RichMessage(message, provider);
  }
  
  getParts(): NormalizedPart[] {
    return this.rawMessage.parts
      .filter(part => part) // Filter out undefined parts
      .map(part => this.normalizePart(part));
  }
  
  getProvider(): Provider {
    return this.provider;
  }
  
  getModel(): string | null {
    const annotations = this.getAnnotations();
    return annotations.model || null;
  }
  
  toRaw(): UIMessage {
    return this.rawMessage;
  }
  
  private normalizePart(part: any): NormalizedPart {
    switch (part.type) {
      case 'text':
        return { type: 'text', content: part.text };
        
      case 'reasoning':
        const extractor = providerExtractors[this.provider];
        return { 
          type: 'reasoning', 
          content: extractor.reasoning(part)
        };
        
      case 'tool-invocation':
        return {
          type: 'tool-invocation',
          toolName: part.toolInvocation.toolName,
          args: part.toolInvocation.args,
          result: part.toolInvocation.result,
          state: part.toolInvocation.state
        };
        
      default:
        return { type: 'unknown', content: JSON.stringify(part) };
    }
  }
  
  private getAnnotations(): Record<string, string> {
    return (this.rawMessage.annotations || [])
      .filter(x => x)
      .reduce((acc, annotation) => ({ ...acc, ...annotation }), {});
  }
}
```

### React Integration

```typescript
// Updated Chat component using RichMessage
function Message({ message, provider }: { message: UIMessage, provider: Provider }) {
  const richMessage = RichMessage.fromRaw(message, provider);
  const parts = richMessage.getParts();
  
  return (
    <div className="message">
      {parts.map((part, idx) => (
        <MessagePart key={idx} part={part} provider={provider} />
      ))}
    </div>
  );
}

function MessagePart({ part, provider }: { part: NormalizedPart, provider: Provider }) {
  switch (part.type) {
    case 'text':
      return <div className="text-content">{part.content}</div>;
      
    case 'reasoning':
      return <ReasoningComponent content={part.content} provider={provider} />;
      
    case 'tool-invocation':
      return <ToolCallComponent invocation={part} />;
      
    default:
      return <div className="unknown-content">{part.content}</div>;
  }
}

function ReasoningComponent({ content, provider }: { content: string, provider: Provider }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="reasoning-container">
      <button onClick={() => setExpanded(!expanded)}>
        Reasoning ({provider})
      </button>
      {expanded && <div className="reasoning-content">{content}</div>}
    </div>
  );
}
```

## Implementation Plan

### **Phase 1: Core Infrastructure (30 min)**
- Create `src/lib/RichMessage.ts` with the wrapper class
- Define `NormalizedPart` types and provider extractors
- Implement lazy evaluation with `getParts()` method
- Add proper TypeScript types and error handling

### **Phase 2: Chat Component Integration (20 min)**  
- Replace `safeGetReasoningContent()` with RichMessage approach
- Update `MessagePart` component to use normalized parts
- Update `Reasoning` component to accept simple content string
- Pass current model provider to message rendering

### **Phase 3: Cleanup & Validation (10 min)**
- Remove complex debugging and type guard functions
- Remove client-side translation attempts
- Keep server-side translation for API wire format consistency
- Test reasoning display across provider switches

## Migration Strategy

- **Step 1**: Implement core `RichMessage` class
- **Step 2**: Update React components to use the new API  
- **Step 3**: Remove fragile translation logic
- **Step 4**: Test thoroughly with all provider combinations

## Implementation Notes & Caveats

### **Risk Mitigation**
- **useChat Integration**: RichMessage works as a view layer - doesn't interfere with useChat's message storage
- **Wire Format**: Server-side translation preserved for API consistency
- **Performance**: Lazy evaluation ensures no overhead until rendering
- **Backward Compatibility**: Raw message access via `toRaw()` method

### **Key Design Decisions**
- **Provider Context**: Current model provider passed down from Chat component
- **Normalized Interface**: All reasoning becomes `{type: 'reasoning', content: string}`
- **Error Handling**: Graceful fallbacks for malformed parts
- **Extensibility**: Easy to add new providers by extending extractors

### **Testing Strategy**
- Verify OpenAI → Anthropic switch works without errors
- Test malformed reasoning parts don't crash
- Confirm no performance regression on message rendering
- Validate server-side API translation still works

## Benefits

### Developer Experience
- **Type Safety**: Proper TypeScript interfaces eliminate runtime errors
- **Consistency**: Single API for all message operations
- **Extensibility**: Easy to add new providers or message types
- **Debugging**: Clear separation between raw and processed data

### Performance
- **Lazy Evaluation**: Only process parts when accessed
- **Minimal Conversion**: Translate only when crossing provider boundaries
- **Memory Efficient**: Share immutable raw data between instances
- **Caching**: Memoize expensive operations like provider detection

### Maintainability
- **Encapsulation**: All provider logic in one place
- **Single Responsibility**: Each method has a clear purpose
- **Testability**: Easy to unit test individual methods
- **Documentation**: Self-documenting API with clear method names

## Potential Issues & Solutions

- **Serialization**: Always use `toRaw()` for wire transfer, reconstruct with provider on receive  
- **Performance**: Lazy evaluation - only normalize parts when `getParts()` is called

## Testing Strategy

```typescript
describe('RichMessage', () => {
  describe('provider detection', () => {
    it('detects OpenAI format from details array');
    it('detects Anthropic format from thinking object');
    it('falls back gracefully for unknown formats');
  });
  
  describe('content extraction', () => {
    it('extracts text content from all providers');
    it('extracts reasoning content preserving structure');
    it('handles missing or malformed parts');
  });
  
  describe('provider translation', () => {
    it('translates OpenAI to Anthropic correctly');
    it('translates Anthropic to OpenAI correctly');
    it('preserves non-reasoning parts during translation');
  });
});
```

This architecture provides a robust foundation for handling multi-provider message formats while maintaining clean separation of concerns and excellent developer experience. 
