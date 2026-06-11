-- Enable Realtime for orders and bookings tables to allow instant status synchronization
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table bookings;
