# EasyPubSub

A lightweight (1.6kb), zero-deps, type-safe publish/subscribe library for TypeScript with powerful filtering capabilities.

## Features

- 🎯 **Topic-based filtering**: Filter messages using exact matches or regular expressions
- 🔍 **Content-based filtering**: Filter messages based on their content
- 📦 **Type-safe**: Full TypeScript support with generic message types
- ⚡ **Async support**: Handle both synchronous and asynchronous message consumers
- 🔒 **Strict mode**: Optional strict topic filtering for more control
- 🎨 **Flexible**: Combine topic and content filtering for precise message routing

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
publisher.subscribe(
  (msg) => console.log(`User message: ${msg}`),
  "user" // topic
);

// Subscribe using regex pattern
publisher.subscribe(
  (msg) => console.log(`System message: ${msg}`),
  /^system-.*$/ // topic pattern
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
publisher.subscribe(
  (msg) => console.log("Error:", msg.data),
  undefined, // no topic filtering
  (msg) => msg.type === "error" // content filter
);

const emit = publisher.getEmitter();

// Only error messages will be received
emit({ type: "info", data: "System started" }); // (ignored)
emit({ type: "error", data: "Connection failed" }); // -> "Error: Connection failed"
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

## API

### `Publisher<Msg>`

- `create<Msg>()`: Creates a new publisher instance
- `subscribe(consume, topicPattern?, contentFilter?, strictTopicFiltering?)`: Subscribes to messages
- `getEmitter()`: Returns a function for emitting messages
- `subscriptionsNumber`: Gets the current number of active subscriptions

### Subscription Options

- `topicPattern`: String, number, or RegExp for filtering by topic
- `contentFilter`: Function for filtering by message content
- `strictTopicFiltering`: When true, messages without topic are rejected if topic pattern is defined

## License

MIT
