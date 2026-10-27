const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runMigrationSuite() {
    console.log('[TEST 18.06] Iniciando validacao automatizada da migration E01.T01 (Supabase PostgreSQL 17)...');

    const migrationPath = path.resolve(
        __dirname,
        '../supabase/migrations/20261014000001_create_users_and_clinical_profiles.sql'
    );

    // 1. Verificar existencia do arquivo versionado em supabase/migrations/
    assert(fs.existsSync(migrationPath), 'Arquivo de migration E01.T01 deve existir em supabase/migrations/');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert(sql.length > 500, 'Conteudo da migration nao deve estar vazio');
    console.log('✓ Arquivo versionado localizado em supabase/migrations/: OK');

    // 2. Verificar criacao das 3 tabelas exigidas: profiles, doctors e patients
    assert(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.profiles/i.test(sql), 'Deve definir a tabela public.profiles');
    assert(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.doctors/i.test(sql), 'Deve definir a tabela public.doctors');
    assert(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.patients/i.test(sql), 'Deve definir a tabela public.patients');
    console.log('✓ Definicao DDL das tabelas profiles, doctors e patients: OK');

    // 3. Verificar chaves primarias UUID e Foreign Keys para auth.users(id)
    const authUsersFkMatches = sql.match(/REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+CASCADE/gi) || [];
    assert(
        authUsersFkMatches.length >= 3,
        `As 3 tabelas (profiles, doctors, patients) devem referenciar auth.users(id) com ON DELETE CASCADE (encontrado: ${authUsersFkMatches.length})`
    );
    assert(
        /id\s+UUID\s+PRIMARY\s+KEY\s+REFERENCES\s+auth\.users\(id\)/i.test(sql),
        'public.profiles deve ter PK UUID referenciando auth.users(id)'
    );
    assert(
        /user_id\s+UUID\s+NOT\s+NULL\s+UNIQUE\s+REFERENCES\s+auth\.users\(id\)/i.test(sql),
        'doctors e patients devem possuir coluna user_id UUID NOT NULL UNIQUE referenciando auth.users(id)'
    );
    console.log('✓ Vinculo UUID com auth.users(id) e integridade referencial (ON DELETE CASCADE): OK');

    // 4. Verificar eliminacao de armazenamento manual de senhas (AppSec 14.02)
    // Remove comentarios SQL antes de inspecionar colunas de senha
    const sqlWithoutComments = sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--') && !line.trim().startsWith('COMMENT ON'))
        .join('\n');
    assert(
        !/password_hash|password|senha/i.test(sqlWithoutComments),
        'Nenhuma coluna de armazenamento manual de senha deve existir no DDL'
    );
    console.log('✓ Eliminacao de armazenamento manual de senhas (delegado ao Supabase Auth): OK');

    // 5. Verificar campos de auditoria (created_at, updated_at) nas 3 tabelas
    const createdAtMatches = sqlWithoutComments.match(/created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/gi) || [];
    const updatedAtMatches = sqlWithoutComments.match(/updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/gi) || [];
    assert.strictEqual(createdAtMatches.length, 3, 'Todas as 3 tabelas devem conter created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    assert.strictEqual(updatedAtMatches.length, 3, 'Todas as 3 tabelas devem conter updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    assert(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.handle_updated_at\(\)/i.test(sql), 'Deve definir funcao de trigger handle_updated_at()');
    assert(/CREATE\s+TRIGGER\s+trg_profiles_updated_at/i.test(sql), 'Deve definir trigger de updated_at para profiles');
    assert(/CREATE\s+TRIGGER\s+trg_doctors_updated_at/i.test(sql), 'Deve definir trigger de updated_at para doctors');
    assert(/CREATE\s+TRIGGER\s+trg_patients_updated_at/i.test(sql), 'Deve definir trigger de updated_at para patients');
    console.log('✓ Campos de auditoria (created_at, updated_at) e triggers automaticos: OK');

    // 6. Verificar diretrizes AppSec (RLS habilitado e search_path seguro)
    assert(/SET\s+search_path\s*=\s*public/i.test(sql), 'Funcao PL/pgSQL deve fixar search_path = public');
    assert(/ALTER\s+TABLE\s+public\.profiles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql), 'RLS deve estar habilitado em public.profiles');
    assert(/ALTER\s+TABLE\s+public\.doctors\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql), 'RLS deve estar habilitado em public.doctors');
    assert(/ALTER\s+TABLE\s+public\.patients\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql), 'RLS deve estar habilitado em public.patients');
    console.log('✓ Hardening AppSec 14.02 (RLS habilitado nas 3 tabelas e search_path fixado): OK');

    console.log('\n[TEST 18.06] Todos os 6 cenarios da migration E01.T01 foram validados com 100% de sucesso.');
}

try {
    runMigrationSuite();
} catch (err) {
    console.error('[TEST 18.06] Falha na suite de testes E01.T01:', err.message);
    process.exitCode = 1;
}
