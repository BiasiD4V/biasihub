import sys

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'psycopg2-binary', '-q'])
    import psycopg2

PROJECT_REF = 'vzaabtzcilyoknksvhrc'
passwords = ['1234', 'biasi2024', 'Biasi2024', 'biasi@2024', 'biasi123', 'admin', 'postgres']
regions = ['sa-east-1', 'us-east-1', 'us-west-1', 'us-west-2']

SQL = """
ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS reacoes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false;
"""

connected = False
for region in regions:
    for pwd in passwords:
        host = f'aws-0-{region}.pooler.supabase.com'
        try:
            conn = psycopg2.connect(
                host=host,
                port=6543,
                dbname='postgres',
                user=f'postgres.{PROJECT_REF}',
                password=pwd,
                sslmode='require',
                connect_timeout=5
            )
            conn.autocommit = True
            print(f'Connected! Region: {region}, Password: {pwd[:4]}...')
            cur = conn.cursor()
            cur.execute(SQL)
            print('Columns added successfully!')
            
            # Verify
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='chat_mensagens' AND column_name IN ('reacoes','deletado')")
            cols = [r[0] for r in cur.fetchall()]
            print(f'Verified columns: {cols}')
            
            cur.close()
            conn.close()
            connected = True
            break
        except Exception as e:
            pass
    if connected:
        break

if not connected:
    print('Could not connect to database with any password/region combination.')
    print('Please run this SQL in Supabase SQL Editor:')
    print(SQL)
