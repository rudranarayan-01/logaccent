# logAccent

A developer-first logging toolkit for Node.js and TypeScript.

`logAccent` combines expressive terminal styling with structured logging, scoped loggers, timing utilities, and secure object formatting. It is designed for developers who want logs that are easier to identify, easier to debug, and easier to maintain.

Unlike color-only libraries, logAccent provides semantic logging primitives that scale from small scripts to large backend services.

---

## Features

- Chainable terminal styling
- Semantic log levels
- Scoped loggers
- High-resolution performance timers
- Context-aware logging
- Sensitive data redaction
- Hex and RGB color support
- Automatic terminal color detection
- ESM and CommonJS support
- TypeScript support
- Zero runtime dependencies
- Tree-shakeable exports
- Production-friendly architecture

---

## Installation

```bash
npm install @rudranarayan01/logaccent
```

---

## Quick Start

```ts
import { accent, logger } from "@rudranarayan01/logaccent";

console.log(accent.red("Database connection failed"));

logger.success("Server started");
logger.info("Listening on port 3000");
logger.warn("Memory usage is increasing");
logger.error("Unable to connect to Redis");
```

---

# Terminal Styling

Basic colors

```ts
console.log(accent.red("Error"));
console.log(accent.green("Success"));
console.log(accent.yellow("Warning"));
console.log(accent.blue("Information"));
console.log(accent.magenta("Custom"));
console.log(accent.cyan("Request"));
```

Multiple styles

```ts
console.log(
    accent.red.bold.underline("Critical error")
);

console.log(
    accent.bgRed.white.bold(" FATAL ")
);
```

Custom colors

```ts
console.log(
    accent.rgb(255, 120, 50)("Orange")
);

console.log(
    accent.hex("#7C3AED")("Purple")
);
```

---

# Semantic Logging

```ts
logger.fatal("Application failed to start");

logger.error("Database connection failed");

logger.warn("Redis latency is high");

logger.success("Deployment completed");

logger.info("Server listening");

logger.debug("Incoming payload", payload);

logger.trace("Entered payment handler");
```

---

# Scoped Loggers

Scopes help organize logs across different modules.

```ts
const authLog = logger.scope("AUTH");

authLog.info("Authentication started");

authLog.success("User authenticated");
```

Nested scopes

```ts
const apiLog = logger.scope("API");

const paymentLog =
    apiLog.scope("PAYMENT");

paymentLog.info("Creating payment intent");
```

Example output

```
[API:PAYMENT] INFO Creating payment intent
```

---

# Performance Timers

Measure execution time without additional utilities.

```ts
const timer =
    logger.time("Database query");

await fetchUsers();

timer.end();
```

Example

```
SUCCESS Database query completed in 42.13ms
```

---

# Logging Context

Attach shared metadata to every log.

```ts
const requestLogger =
    logger.withContext({
        requestId: "req_123",
        userId: "user_42"
    });

requestLogger.info("Request received");
```

---

# Sensitive Data Redaction

Mask confidential information before logging.

```ts
import {
    logger,
    redact
} from "@rudranarayan01/logaccent";

logger.info(
    "Authentication payload",
    redact({
        email: "developer@example.com",
        password: "secret",
        accessToken: "abc123"
    })
);
```

Output

```json
{
  "email": "developer@example.com",
  "password": "[REDACTED]",
  "accessToken": "[REDACTED]"
}
```

---

# Creating a Custom Logger

```ts
import {
    createLogger
} from "@rudranarayan01/logaccent";

const log =
    createLogger({
        scope: "DATABASE",
        level: "debug"
    });

log.info("Executing query");
```

---

# Production Configuration

Development

```ts
const logger =
    createLogger({
        level: "debug"
    });
```

Production

```ts
const logger =
    createLogger({
        level: "warn"
    });
```

This keeps warnings and errors while reducing unnecessary console noise in production.

---

# TypeScript

logAccent is written in TypeScript and includes bundled type definitions.

```ts
import {
    accent,
    logger,
    createLogger
} from "@rudranarayan01/logaccent";
```

No additional configuration is required.

---

# Browser Support

The styling API works in Node.js terminals.

For browser environments, colors are omitted automatically while preserving the same API surface.

---

# API

## Styling

```ts
accent.red()
accent.green()
accent.yellow()
accent.blue()
accent.magenta()
accent.cyan()
accent.white()
accent.gray()

accent.bold()
accent.italic()
accent.underline()
accent.dim()
accent.inverse()
accent.strikethrough()

accent.bgRed()
accent.bgBlue()
accent.bgGreen()

accent.rgb()
accent.bgRgb()

accent.hex()
accent.bgHex()
```

---

## Logger

```ts
logger.fatal()

logger.error()

logger.warn()

logger.success()

logger.info()

logger.debug()

logger.trace()

logger.scope()

logger.withContext()

logger.time()
```

---

# Design Goals

logAccent is built around a few simple principles.

- Keep the API small and expressive.
- Prefer semantic logging over raw console output.
- Preserve type safety.
- Avoid runtime dependencies.
- Respect production environments.
- Make debugging faster through structured output.

---

# Roadmap

Planned features include:

- Log tables
- Highlight helpers
- Diff viewer
- Boxed messages
- Progress indicators
- File transport
- JSON transport
- Browser console themes
- React Native adapter

---

# Contributing

Issues, feature requests, and pull requests are welcome.

If you have an idea that improves developer experience without increasing unnecessary complexity, feel free to open a discussion.

---

# License

MIT