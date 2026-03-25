# Shopify APIs Codebase Documentation

## Overview

This repository contains a Next.js-based API service that provides various custom endpoints for multiple Shopify stores. The system is designed to handle store-specific business logic, integrations with third-party services, and automated workflows while maintaining strict TypeScript typing and code quality standards.

## Architecture

### Core Technologies

- **Framework**: Next.js 14.2.5 with App Router
- **Language**: TypeScript with strict configuration
- **GraphQL**: Shopify Admin API integration using URQL
- **Validation**: Zod for runtime type validation
- **Email**: Nodemailer with OAuth2 support
- **Deployment**: Vercel with cron jobs

### Project Structure

```
├── admin-api/                    # Shopify Admin API integration
│   ├── admin-client.ts          # URQL client configuration
│   ├── operations.ts            # GraphQL queries and mutations
│   └── graphql.ts              # GraphQL schema definitions
├── constants/                   # Configuration and constants
│   ├── Credentials.ts          # Credential management system
│   ├── StoreMap.ts             # Store registry and types
│   ├── Mail.ts                 # Email configuration
│   ├── ThirdPartyEndpoints.ts  # External API endpoints
│   └── stores/                 # Individual store configurations
├── src/
│   ├── app/api/                # API route handlers
│   │   ├── biobarat/          # Bio-Barát store endpoints
│   │   ├── gyorgytea/         # Gyorgy Tea store endpoints
│   │   ├── nordvital/         # Nordvital store endpoints
│   │   ├── v24/               # V24 store endpoints
│   │   ├── zhaozhoutea/       # Zhao Zhou Tea endpoints
│   │   └── workflow/          # Automated workflows
│   ├── config/                 # Service configurations
│   ├── schemas/                # Zod validation schemas
│   ├── services/               # Business logic services
│   └── utils/                  # Utility functions
└── manual-scripts/             # Development scripts
```

## Store Management System

### Store Configuration Pattern

Each store is defined in `constants/stores/` with a standardized structure:

```typescript
interface StoreData {
  name: string;
  domain: string;
  logo?: string;
  credentials: Credentials;
}
```

### Supported Stores

- **V24**: Health and wellness products
- **GyorgyteaLive/GyorgyteaDev**: Tea products (live and dev environments)
- **Nordvital**: Nutritional supplements
- **BioBarat**: Organic products
- **ZhaoZhouTeaHu/ZhaoZhouTeaEu**: Tea products (Hungarian and EU markets)
- **TestBarat**: Testing environment

### Credential Management

The system uses a type-safe credential management system with three credential types:

```typescript
enum CredentialType {
  Email = 'email',
  AdminApi = 'adminApi',
  FizzApi = 'fizzApi',
}
```

Credentials are accessed through the `getCredentials()` function with proper type safety and null checking.

## API Endpoint Patterns

### Standard Endpoint Structure

All API endpoints follow a consistent pattern:

1. **CORS Headers**: Standardized CORS configuration
2. **Input Validation**: Zod schema validation for request bodies
3. **Error Handling**: Comprehensive error handling with proper HTTP status codes
4. **Type Safety**: Strict TypeScript typing throughout
5. **Logging**: Structured logging for debugging and monitoring

### Common Endpoint Types

#### 1. VAT Validation Endpoints

- **Purpose**: Validate VAT numbers using EU VIES API
- **Example**: `/api/biobarat/vat`
- **Pattern**: External API integration with response validation

#### 2. Discount Management Endpoints

- **Purpose**: Handle Shopify discount codes and customer metafields
- **Example**: `/api/gyorgytea/discount-code`
- **Pattern**: Shopify Admin API integration with complex business logic

#### 3. Order Status Management

- **Purpose**: Update order statuses based on external webhooks
- **Example**: `/api/nordvital/change-order-status`
- **Pattern**: Webhook processing with fulfillment updates

#### 4. Email Services

- **Purpose**: Send transactional emails with product recommendations
- **Example**: `/api/v24/test-email`
- **Pattern**: HTML email generation with OAuth2 authentication

## Services Architecture

### Fizz Integration Service

The `FizzSyncService` handles synchronization between Shopify and the Fizz platform:

```typescript
class FizzSyncService {
  // Handles product synchronization
  async syncProducts(): Promise<SyncSummary>;

  // Fetches products from Fizz API
  async fetchAllFizzProductRequests(): Promise<FizzProductRequest[]>;

  // Creates/updates products in Fizz
  async createOrUpdateFizzProduct(product: ShopifyProduct): Promise<SyncResult>;
}
```

**Key Features**:

- Batch processing with configurable concurrency
- Automatic retry logic with exponential backoff
- Comprehensive error handling and logging
- Type-safe data transformation between platforms

### Fizz Client

The `FizzClient` provides a robust HTTP client for Fizz API interactions:

```typescript
class FizzClient {
  // OAuth2 token management with caching
  async getAccessToken(): Promise<string>;

  // Generic HTTP request method
  async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;

  // Convenience methods for common operations
  async get<T>(endpoint: string);
  async post<T>(endpoint: string, data?: object);
  async put<T>(endpoint: string, data?: object);
  async delete<T>(endpoint: string);
}
```

**Features**:

- Automatic token refresh on 401 responses
- Response type validation and error handling
- Support for both JSON and non-JSON responses
- Configurable retry logic

## Shopify Admin API Integration

### GraphQL Operations

The system uses a comprehensive set of GraphQL operations defined in `admin-api/operations.ts`:

- **Customer Management**: Create, update, and query customers
- **Product Operations**: Fetch products with metafields and variants
- **Discount Management**: Handle discount codes and automatic discounts
- **Order Management**: Update order statuses and fulfillments
- **Metafield Operations**: Manage custom metafields

### Type Safety

All GraphQL operations are fully typed using `gql.tada` for compile-time type safety and IntelliSense support.

## Configuration Management

### Environment Variables

The system uses environment variables for:

- Store-specific API credentials
- Third-party service configurations
- Feature flags and operational settings

### Store-Specific Configurations

Each store can have custom configurations for:

- Fizz sync settings (batch size, concurrency, delivery time)
- Email templates and settings
- API endpoints and credentials

## Code Quality Standards

### TypeScript Configuration

- **Strict Mode**: Enabled with comprehensive type checking
- **No Any Types**: Explicitly prohibited via ESLint rules
- **Type Imports**: Enforced for better tree-shaking
- **Null Safety**: Strict null checks throughout

### ESLint Rules

The project uses a strict ESLint configuration that enforces:

- No `any` types
- No unsafe operations
- Consistent type imports
- Proper error handling
- Code formatting standards

### Validation Patterns

All external data is validated using Zod schemas:

- Request body validation
- API response validation
- Configuration validation
- Type-safe data transformation

## Deployment and Operations

### Vercel Configuration

- **Cron Jobs**: Automated Fizz sync runs daily at 9 AM UTC
- **Environment Variables**: Secure credential management
- **Serverless Functions**: Optimized for cold start performance

### Monitoring and Logging

- Structured logging throughout the application
- Error tracking and reporting
- Performance monitoring for API endpoints
- Webhook processing logs

## Development Workflow

### Adding New Stores

1. Create store configuration in `constants/stores/`
2. Add credentials to environment variables
3. Update `StoreMap.ts` to include the new store
4. Create store-specific API endpoints if needed

### Adding New API Endpoints

1. Create route handler in appropriate store directory
2. Define Zod schemas for request/response validation
3. Implement proper error handling and CORS headers
4. Add comprehensive logging and monitoring

### Adding New Services

1. Create service class with proper TypeScript typing
2. Implement error handling and retry logic
3. Add configuration management
4. Create comprehensive tests

## Security Considerations

- **Credential Management**: All sensitive data stored in environment variables
- **Input Validation**: All inputs validated using Zod schemas
- **CORS Configuration**: Properly configured for cross-origin requests
- **Error Handling**: No sensitive information leaked in error responses
- **Type Safety**: Compile-time type checking prevents runtime errors

## Integration Patterns

### External API Integration

1. **Authentication**: OAuth2 or API key-based authentication
2. **Rate Limiting**: Respectful API usage with retry logic
3. **Error Handling**: Comprehensive error handling and logging
4. **Type Safety**: Full TypeScript typing for all API interactions

### Shopify Webhook Processing

1. **Validation**: Verify webhook authenticity and data structure
2. **Idempotency**: Handle duplicate webhook deliveries
3. **Error Recovery**: Robust error handling and retry mechanisms
4. **Logging**: Comprehensive logging for debugging and monitoring

This documentation provides a complete understanding of the codebase architecture, patterns, and conventions. It serves as a comprehensive guide for developers working with the system and as context for AI models to understand the codebase structure and implementation details.
