
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS revenuecat_user_id text,
  ADD COLUMN IF NOT EXISTS store text,
  ADD COLUMN IF NOT EXISTS original_transaction_id text,
  ADD COLUMN IF NOT EXISTS product_identifier text,
  ADD COLUMN IF NOT EXISTS entitlement text;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IN ('stripe','revenuecat'))
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_original_tx ON public.subscriptions(original_transaction_id) WHERE original_transaction_id IS NOT NULL;
