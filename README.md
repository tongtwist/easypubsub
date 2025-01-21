# EasyPubSub

A lightweight (< 2kb), zero-deps, type-safe Pub/Sub library for TypeScript with powerful filtering capabilities.

## Features

- 🎯 **Topic-based filtering**: Filter messages using exact matches or regular expressions
- 🔍 **Content-based filtering**: Filter messages based on their content
- 📦 **Type-safe**: Full TypeScript support with generic message types
- ⚡ **Async support**: Handle both synchronous and asynchronous message consumers
- 🔒 **Strict mode**: Optional strict topic filtering for more control
- 🎨 **Flexible**: Combine topic and content filtering for precise message routing
- 🔄 **Independent subscriptions**: Multiple identical subscriptions are allowed and managed independently

## Installation

```bash
bun add easypubsub
# or
npm install easypubsub
```

## Usage

### Basic Example

```typescript
import { Publisher } from "easypubsub";

// Create a publisher for string messages
const publisher = Publisher.create<string>();

// Subscribe to all messages
const unsubscribe = publisher.subscribe((message) =>
  console.log(`Received: ${message}`)
);

// Get an emitter function
const emit = publisher.getEmitter();

// Emit a message
emit("Hello, World!");

// Later, unsubscribe when done
unsubscribe();
```

### Topic Filtering

```typescript
import { Publisher } from "easypubsub";

const publisher = Publisher.create<string>();

// Subscribe to specific topic
publisher.subscribe((msg) => console.log(`User message: ${msg}`), "user");

// Subscribe using regex pattern
publisher.subscribe(
  (msg) => console.log(`System message: ${msg}`),
  /^system-.*$/
);

const emit = publisher.getEmitter();

// Messages will be routed based on topic
emit("New user connected", "user"); // -> "User message: New user connected"
emit("CPU usage: 80%", "system-metrics"); // -> "System message: CPU usage: 80%"
```

### Content Filtering

```typescript
interface Message {
  type: string;
  data: unknown;
}

const publisher = Publisher.create<Message>();

// Filter messages based on their content
publisher.subscribe((msg) => console.log("Error:", msg.data), {
  contentFilter: (msg) => msg.type === "error",
});

const emit = publisher.getEmitter();

// Only error messages will be received
emit({ type: "info", data: "System started" }); // (ignored)
emit({ type: "error", data: "Connection failed" }); // -> "Error: Connection failed"
```

### Combined Filtering

```typescript
const publisher = Publisher.create<Message>();

// Combine topic and content filtering
publisher.subscribe((msg) => console.log("System Error:", msg.data), {
  topicPattern: "system",
  strictTopicFiltering: true,
  contentFilter: (msg) => msg.type === "error",
});

const emit = publisher.getEmitter();

// Only system errors will be received
emit({ type: "error", data: "Auth failed" }, "auth"); // (ignored)
emit({ type: "info", data: "CPU usage" }, "system"); // (ignored)
emit({ type: "error", data: "Out of memory" }, "system"); // -> "System Error: Out of memory"
```

### Async Message Handling

```typescript
const publisher = Publisher.create<string>();

// Subscribe with async handler
publisher.subscribe(async (msg) => {
  await someAsyncOperation(msg);
  console.log("Processed:", msg);
});

const emit = publisher.getEmitter();

// Emission returns a promise that resolves when all handlers complete
await emit("Process me");
console.log("All handlers completed");
```

### Handling Duplicate Subscriptions

```typescript
const publisher = Publisher.create<string>();
const options = {
  topicPattern: "user",
  strictTopicFiltering: true,
};

// Creating multiple subscriptions with identical parameters
const unsubscribe1 = publisher.subscribe(
  (msg) => console.log("Handler 1:", msg),
  options
);
const unsubscribe2 = publisher.subscribe(
  (msg) => console.log("Handler 2:", msg),
  options
);

const emit = publisher.getEmitter();

// Both handlers will receive the message
emit("Hello", "user");
// Output:
// Handler 1: Hello
// Handler 2: Hello

// Each subscription is managed independently
unsubscribe1(); // Only removes the first subscription
// Now only Handler 2 will receive messages
```

## API

### `Publisher<Msg>`

- `create<Msg>()`: Creates a new publisher instance
- `subscribe(consume, filteringOptions?)`: Subscribes to messages with optional filtering. Returns an unsubscribe function that removes only this specific subscription. Note that identical subscriptions are allowed and each will receive messages independently.
- `getEmitter()`: Returns a function for emitting messages
- `subscriptionsNumber`: Gets the current number of active subscriptions

### Filtering Options

```typescript
type FilteringOptions<Msg> =
  | {
      // Pattern to match against message topics
      topicPattern?: string | number | RegExp;

      // When true, messages without topic will be rejected when topicPattern is set
      // When false, messages without topic will be delivered regardless of topicPattern
      // Default equals to typeof topicPattern !== "undefined"
      strictTopicFiltering?: boolean;

      // Optional function to filter messages based on their content
      contentFilter?: (msg: Msg) => boolean;
    }
  | string // ... or you can just
  | number // give a topicPattern value.
  | RegExp; // (strictTopicFiltering=false and contentFilter=undefined)
```

#### Examples

```typescript
// Default options (no filtering)
publisher.subscribe(consume);

// Topic-only filtering
publisher.subscribe(consume, {
  topicPattern: "my-topic",
  strictTopicFiltering: true,
});

// Content-only filtering
publisher.subscribe(consume, {
  strictTopicFiltering: false,
  contentFilter: (msg) => typeof msg === "string",
});

// Combined filtering
publisher.subscribe(consume, {
  topicPattern: new RegExp("topic-.*"),
  strictTopicFiltering: true,
  contentFilter: (msg) => msg.length > 0,
});
```

## License

MIT
