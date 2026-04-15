# snippe-js-sdk

Official JavaScript / TypeScript SDK for the Snippe payment platform.

> Status: early boilerplate. No live API integrations yet.

## Install

```bash
npm install snippe-js-sdk
# or
yarn add snippe-js-sdk
# or
pnpm add snippe-js-sdk
```

## Usage

### ESM / TypeScript

```ts
import { Snippe } from "snippe-js-sdk";

const snippe = new Snippe({
  apiKey: process.env.SNIPPE_API_KEY!,
  environment: "sandbox", // or "production"
});

const status = await snippe.ping();
console.log(status);
```

### CommonJS

```js
const { Snippe } = require("snippe-js-sdk");

const snippe = new Snippe({ apiKey: "sk_test_..." });
```

## Configuration

| Option        | Type                         | Default                           | Description                        |
| ------------- | ---------------------------- | --------------------------------- | ---------------------------------- |
| `apiKey`      | `string`                     | —                                 | Required. Your Snippe API key.     |
| `environment` | `"sandbox" \| "production"` | `"sandbox"`                       | Target environment.                |
| `baseUrl`     | `string`                     | Derived from `environment`        | Override the API base URL.         |
| `timeoutMs`   | `number`                     | `30000`                           | Per-request timeout.               |

## Project structure

```
snippe-js-sdk/
├── src/
│   ├── index.ts         # SDK entrypoint
│   └── types/
│       └── index.ts     # Public type definitions
├── dist/                # Build output (ESM, CJS, types)
├── tsconfig.json        # Base TS config
├── tsconfig.esm.json    # ESM build
├── tsconfig.cjs.json    # CJS build
├── tsconfig.types.json  # Declaration build
└── package.json
```

## Development

```bash
npm install
npm run typecheck
npm run build
```

Build outputs land in `dist/`:
- `dist/esm/` — ES modules
- `dist/cjs/` — CommonJS
- `dist/types/` — `.d.ts` declarations

## License

MIT
