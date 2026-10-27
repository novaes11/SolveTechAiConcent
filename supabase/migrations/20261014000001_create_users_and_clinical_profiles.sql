-- ============================================================================
-- Migration: 20261014000001_create_users_and_clinical_profiles.sql
-- Task: [P0] E01.T01: Criar Migrations de Usuarios e Perfis Clinicos no Supabase
-- Alvo: PostgreSQL 17 (Supabase)
-- Descricao: Define as tabelas public.profiles, public.doctors e public.patients
--            referenciando auth.users(id) via UUID, eliminando armazenamento
--            manual de senhas e adicionando campos de auditoria (created_at, updated_at).
-- ============================================================================

BEGIN;

-- 1. Funcao utilitaria para atualizacao automatica do campo de auditoria updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. Tabela public.profiles (Identidade civil vinculada 1:1 ao Supabase Auth)
-- Elimina a antiga tabela de login/password_hash delegando credenciais a auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    biological_sex CHAR(1) NOT NULL,
    birth_date DATE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
    phone_ddd SMALLINT,
    phone_number VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_profiles_cpf_length CHECK (char_length(btrim(cpf)) BETWEEN 11 AND 14),
    CONSTRAINT chk_profiles_biological_sex CHECK (biological_sex IN ('M', 'F', 'O')),
    CONSTRAINT chk_profiles_role CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
    CONSTRAINT chk_profiles_phone_ddd CHECK (phone_ddd IS NULL OR (phone_ddd BETWEEN 11 AND 99))
);

COMMENT ON TABLE public.profiles IS 'Perfis base dos usuarios vinculados 1:1 a auth.users(id), sem armazenamento manual de senhas.';

-- 3. Tabela public.doctors (Perfil profissional medico)
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    crm VARCHAR(20) NOT NULL UNIQUE,
    crm_uf CHAR(2) NOT NULL,
    speciality VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doctors_crm_not_empty CHECK (char_length(btrim(crm)) >= 4),
    CONSTRAINT chk_doctors_crm_uf_length CHECK (char_length(btrim(crm_uf)) = 2)
);

COMMENT ON TABLE public.doctors IS 'Perfis clinicos de medicos referenciando auth.users(id) e public.profiles(id) via UUID.';

-- 4. Tabela public.patients (Perfil clinico do paciente para monitoramento de cronicos)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_type VARCHAR(5),
    emergency_contact_name VARCHAR(200),
    emergency_phone VARCHAR(20),
    allergies TEXT,
    chronic_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_patients_blood_type CHECK (
        blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    )
);

COMMENT ON TABLE public.patients IS 'Perfis clinicos de pacientes hipertensos e diabeticos referenciando auth.users(id) e public.profiles(id) via UUID.';

-- 5. Indices para chaves estrangeiras e buscas frequentes
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_profile_id ON public.doctors(profile_id);
CREATE INDEX IF NOT EXISTS idx_doctors_crm_uf ON public.doctors(crm, crm_uf);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON public.patients(profile_id);

-- 6. Triggers de auditoria para atualizacao automatica de updated_at
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_doctors_updated_at ON public.doctors;
CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Hardening AppSec (14.02): Habilitacao de Row Level Security por padrao (Zero-Trust)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

COMMIT;
