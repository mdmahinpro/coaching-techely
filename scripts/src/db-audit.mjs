#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error('Missing env vars'); process.exit(1); }

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
console.log('Project ref:', projectRef);

async function tryConnect(connStr, label) {
  const c = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  try {
    await c.connect();
    console.log(`✅ Connected via ${label}`);
    return c;
  } catch (e) {
    await c.end().catch(() => {});
    console.log(`  ❌ ${label}: ${e.message.slice(0, 80)}`);
    return null;
  }
}

let client = null;
const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'eu-west-1'];
for (const region of regions) {
  client = await tryConnect(`postgresql://postgres.${projectRef}:${SERVICE_ROLE_KEY}@aws-0-${region}.pooler.supabase.com:6543/postgres`, `pooler ${region}`);
  if (client) break;
}
if (!client) {
  client = await tryConnect(`postgresql://postgres:${SERVICE_ROLE_KEY}@db.${projectRef}.supabase.co:5432/postgres`, 'direct');
}
if (!client) { console.error('❌ Could not connect'); process.exit(1); }

const q = async (sql) => (await client.query(sql)).rows;

console.log('\n══ COLUMNS (key tables) ══');
const cols = await q(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('students','exams','fees','sms_logs','batches') ORDER BY table_name, column_name`);
cols.forEach(r => console.log(`  ${r.table_name}.${r.column_name} [${r.data_type}]`));

console.log('\n══ ALL TABLES ══');
const tables = await q(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
tables.forEach(r => console.log(`  ${r.tablename}`));

console.log('\n══ RLS POLICIES ══');
const pol = await q(`SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname`);
pol.forEach(r => console.log(`  [${r.cmd}][${(r.roles||[]).join(',')}] ${r.tablename}: ${r.policyname}`));

console.log('\n══ FUNCTIONS ══');
const fn = await q(`SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' ORDER BY routine_name`);
fn.forEach(r => console.log(`  ${r.routine_name}`));

console.log('\n══ FEES CHECK CONSTRAINTS ══');
const cc = await q(`SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE contype='c' AND conrelid='public.fees'::regclass`);
cc.forEach(r => console.log(`  ${r.conname}: ${r.def}`));

await client.end();
console.log('\n✅ Audit complete');
