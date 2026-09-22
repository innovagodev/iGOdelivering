-- Allow public/anonymous users to update an order status to 'expired' only if it is currently 'new' or 'pending'
DROP POLICY IF EXISTS "orders: public update expired" ON public.orders;

CREATE POLICY "orders: public update expired" ON public.orders
  FOR UPDATE
  USING (status = 'new' OR status = 'pending')
  WITH CHECK (status = 'expired');
