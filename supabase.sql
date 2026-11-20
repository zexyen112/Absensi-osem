
-- =========================================
-- MPK OSIS ATTENDANCE SYSTEM
-- SECURITY & DATA INTEGRITY PATCH
-- =========================================

-- 1. LINDUNGI TOKEN QR
-- Token hanya boleh diakses melalui RPC.

drop policy if exists "authenticated qr read"
on public.member_qr;

revoke all on table public.member_qr
from public, anon, authenticated;


-- 2. LINDUNGI RIWAYAT ABSENSI
-- Menghapus anggota/kegiatan tidak boleh
-- menghapus riwayat absensi secara otomatis.

alter table public.attendance
drop constraint if exists attendance_event_id_fkey;

alter table public.attendance
drop constraint if exists attendance_member_id_fkey;

alter table public.attendance
add constraint attendance_event_id_fkey
foreign key (event_id)
references public.events(id)
on delete restrict;

alter table public.attendance
add constraint attendance_member_id_fkey
foreign key (member_id)
references public.members(id)
on delete restrict;


-- 3. AMANKAN BATAS MAKSIMAL 5 AKUN
-- Mencegah dua pembuatan akun bersamaan
-- melewati batas yang ditentukan.

create or replace function public.enforce_max_five_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform pg_catalog.pg_advisory_xact_lock(20261120, 5);

    if (
        select count(*)
        from auth.users
    ) >= 5 then
        raise exception
        'Batas maksimal 5 akun petugas telah tercapai.';
    end if;

    return new;
end;
$$;

drop trigger if exists limit_auth_users_to_five
on auth.users;

create trigger limit_auth_users_to_five
before insert on auth.users
for each row
execute function public.enforce_max_five_users();


-- SELESAI
