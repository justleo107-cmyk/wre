-- Seed Data for Platform Explorer Badge
INSERT INTO public.badges (id, name, icon, description, xp_required)
VALUES ('platform-explorer', 'Platform Explorer', '🧭', 'Completed the Vanta Product Tour', 100)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    xp_required = EXCLUDED.xp_required;
