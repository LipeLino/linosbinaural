export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_USD?: string;
  STRIPE_PRICE_BRL?: string;
  STRIPE_PRODUCT_ID?: string;
  STRIPE_MODE?: 'test' | 'live';
  PUBLIC_ORIGIN: string;
  RATE_LIMITER?: RateLimitBinding;
}
