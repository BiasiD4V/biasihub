-- ============================================================
-- ERP BIASI — Migração: Adicionar coluna tipo em obras
-- Data: 2026-04
--
-- O campo tipo é mapeado do campo enterpriseType da API Sienge
-- (/enterprises). Rode esta migration no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE obras ADD COLUMN IF NOT EXISTS tipo TEXT;

COMMENT ON COLUMN obras.tipo IS 'Tipo de empreendimento vindo da API Sienge (enterpriseType)';
