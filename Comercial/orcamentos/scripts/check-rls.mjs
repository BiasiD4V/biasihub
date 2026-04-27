const url = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

const sql = `
SELECT polname, polcmd, pg_catalog.pg_get_expr(polqual, polrelid) AS using_expr,
       pg_catalog.pg_get_expr(polwithcheck, polrelid) AS check_expr
FROM pg_policy
WHERE polrelid = 'public.presenca_usuarios'::regclass;
`;

const res = await fetch(url + '/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + key,
    apikey: key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
console.log('Status:', res.status);
const text = await res.text();
console.log(text);
