-- 2026-11-20: billing_webhook_events was created without the standard
-- grants, so the billing Edge Function's service-role client could not
-- record verified Razorpay webhooks (live symptom: signature verified,
-- then 500 receipt_failed during the Razorpay go-live proof). The
-- function inserts the receipt and deletes it on a failed entitlement
-- write; the entitlement RPCs already had EXECUTE for service_role.
-- Applied live via the Management API on 2026-11-20; this file records
-- it for rebuilds.
grant select, insert, update, delete on public.billing_webhook_events to service_role;
