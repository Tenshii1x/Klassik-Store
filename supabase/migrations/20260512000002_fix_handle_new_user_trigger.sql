-- Fix: handle_new_user trigger fallaba al crear usuarios desde el dashboard
-- ("Database error creating new user") porque no calificaba la tabla con su schema
-- ni declaraba un search_path explícito. Supabase requiere ambos para triggers
-- security definer que se invocan desde el servicio de auth.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, rol)
  values (new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
