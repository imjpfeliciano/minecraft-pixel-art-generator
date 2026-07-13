<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Node & Package Manager

- Always use the Node version specified in `.nvmrc` (currently `v24.16.0`). Run `nvm use` before executing any Node commands.
- Use **pnpm** to install dependencies. Never use `npm install` or `yarn`.

## State Management

- For **local or short-lived state**, use the React Context API.
- For **state shared across multiple unrelated components**, prefer **Zustand**.

## Styling

- Use **Tailwind CSS v4** for all component styling. Do not introduce other CSS-in-JS solutions or plain CSS files unless absolutely necessary.

## Component Design

- Focus on **separation of concerns**: keep components small, focused, and reusable.
- When a component has different behaviors or appearances, implement them as **variants** rather than branching logic inside a single component.
- Always check for an existing **shadcn/ui** component before building a new one from scratch. Prefer shadcn/ui components whenever they cover the use case.
