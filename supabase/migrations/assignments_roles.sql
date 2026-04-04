create table public.assignments (
                                    id uuid not null default gen_random_uuid (),
                                    user_id uuid not null,
                                    training_id bigint not null,
                                    assigned_by uuid null,
                                    organization_id text not null,
                                    assigned_at timestamp with time zone null default timezone ('utc'::text, now()),
                                    due_date timestamp with time zone null,
                                    constraint assignments_pkey primary key (id),
                                    constraint assignments_user_id_training_id_key unique (user_id, training_id),
                                    constraint assignments_assigned_by_fkey foreign KEY (assigned_by) references auth.users (id) on delete set null,
                                    constraint assignments_training_id_fkey foreign KEY (training_id) references trainings (id) on delete CASCADE,
                                    constraint assignments_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

alter policy "Admins can manage assignments"
on "public"."assignments"
to public
      using (
  ((organization_id = ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text))
);

alter policy "Users can view own assignments"
on "public"."assignments"
to public
using (
             (auth.uid() = user_id)
);

alter policy "Admins can update profiles in their org"
on "public"."profiles"
to public
using (
        (EXISTS ( SELECT 1
   FROM get_my_profile() me(role, organization_id)
  WHERE ((me.role = 'admin'::text) AND (me.organization_id = profiles.organization_id))))
      ) with check (
        (EXISTS ( SELECT 1
   FROM get_my_profile() me(role, organization_id)
  WHERE ((me.role = 'admin'::text) AND (me.organization_id = profiles.organization_id))))
);

alter policy "Users can update own profile"
on "public"."profiles"
to public
using (
         (auth.uid() = user_id)
);

alter policy "Users can view profiles in their organization"
on "public"."profiles"
to public
using (
        (((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) AND (organization_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text))) OR (id = auth.uid()))
);