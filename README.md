# Pretoria Prime Recycling app

Mobile-first web app (Next.js + Supabase) for Silver Lakes door-to-door recycling collection.
Screens: onboarding, sign up, log in, dashboard, schedule pickup, payment & subscription,
profile, notifications, bins guide, help & support. Installable on a phone home screen.

## Setup
1. Supabase: create a project, open SQL Editor, run all of `supabase/schema.sql` once.
2. Supabase > Authentication > Sign In / Providers > Email: for testing, turn OFF "Confirm email".
   (Turn it back on before launch.)
3. `npm install`, copy `.env.local.example` to `.env.local`, paste your Supabase URL and key.
4. Edit `lib/site.js`: WhatsApp/phone/email, bank details, bin guide, FAQs.
5. `npm run dev` and open http://localhost:3000
6. Deploy: push to GitHub, import in Vercel, add the same two environment variables.

## Running the business (Supabase > Table Editor)
- Add a row to `pickups` (user_id, pickup_date, status = completed, weight_kg) and the customer's
  dashboard totals update and they get a "Pickup completed" notification automatically.
- Add a row to `payments` (user_id, amount, status = paid) for each EFT you receive; the customer
  gets a "Payment successful" notification. Match payments using the customer's reference (PPR-XXXXXX).
- Add yourself as staff so you can see all customers: create a user, then run
  `insert into admins (user_id) values ('THE-USER-ID');`
