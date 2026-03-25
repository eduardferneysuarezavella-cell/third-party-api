# Shopify custom APIs & integrations

This project is a **backend service** for Shopify stores. It hosts secure HTTP APIs that connect your shops to **custom business rules**, **third-party systems**, and **automation**—things Shopify alone does not provide out of the box.

## What it is used for

- **Store-specific logic** — Different brands (for example wellness, tea, supplements, organic goods) can each have their own endpoints and settings while sharing one codebase.
- **Shopify Admin API** — Creates and updates customers, products, discounts, orders, fulfillments, and metafields through GraphQL, with validation and error handling.
- **Third-party platforms** — Integrates with external services (for example product sync to other commerce or logistics platforms) using scheduled jobs and APIs.
- **Compliance & data checks** — Examples include validating VAT numbers against official EU services before you treat a customer as VAT-registered.
- **Orders & fulfillment** — Reacts to external events (for example webhooks) to update order or fulfillment status in Shopify.
- **Email** — Sends transactional email (for example with product recommendations) using your configured mail provider.

In short: **your Shopify storefronts stay on Shopify; this service is the “engine room” for custom APIs, sync, and workflows** that your apps, partners, or internal tools call.

## Who it is for

- **Merchants and stakeholders** — Understand that this is not the customer-facing shop; it is the technical layer that powers integrations and automations behind the scenes.
- **Developers and agencies** — Implement and extend routes under `src/app/api/`, configure stores in `constants/stores/`, and deploy like any Next.js app (commonly on Vercel).

## What you get (at a glance)

| Area | Purpose |
|------|--------|
| Multi-store support | One deployment can serve several Shopify brands with separate configuration. |
| Validated APIs | Requests are checked (for example with Zod) before touching Shopify or external APIs. |
| Scheduled tasks | Example: daily sync jobs (configured for deployment platforms that support cron). |
| Security-minded design | Credentials live in environment variables; errors avoid leaking sensitive details. |

## Running the project locally

Prerequisites: [Node.js](https://nodejs.org/) and npm (or yarn/pnpm/bun).

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). **Most value is in the API routes** under `src/app/api/` rather than the default home page.

Build for production:

```bash
npm run build
npm start
```

## Configuration

Store names, domains, and credentials are managed in code and **environment variables**. Each store can have its own API keys, email settings, and integration endpoints. Your team sets these during deployment; they are not committed to the repository.

## Further documentation

For architecture, folder layout, patterns for new endpoints, and developer conventions, see **`CODEBASE_DOCUMENTATION.md`** in this repository.

## Tech stack (summary)

- **Next.js** (App Router) — API routes and deployment
- **TypeScript** — Typed, maintainable code
- **Shopify Admin API** — GraphQL via URQL / gql.tada
- **Zod** — Request and data validation

---

*This service is intended to be deployed to a secure environment (for example Vercel) with secrets configured there—not run exposed on the public internet without proper access control.*
