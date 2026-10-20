import os
import pathlib
import pwd
import shutil
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
bindir = subprocess.check_output(['pg_config', '--bindir'], text=True).strip()
tmp = pathlib.Path(tempfile.mkdtemp(prefix='invoice-rls-'))
prefix = []
if os.geteuid() == 0:
    user = pwd.getpwnam('postgres')
    os.chown(tmp, user.pw_uid, user.pw_gid)
    prefix = ['runuser', '-u', 'postgres', '--']


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=30)


try:
    run(prefix + [bindir + '/initdb', '-D', str(tmp / 'data'), '-A', 'trust', '--no-locale'])
    run(prefix + [bindir + '/pg_ctl', '-D', str(tmp / 'data'), '-l', str(tmp / 'log'), '-o', f'-k {tmp} -h "" -p 6548', '-w', 'start'])
    source = (root / 'db/rls.sql').read_text()
    helpers = source[source.index('CREATE OR REPLACE FUNCTION current_tenant_id'):source.index('-- Tenant Policies')]
    policies = source[source.index('CREATE POLICY invoice_tenant_isolation'):source.index('-- Reconciliation Policies')]
    migration = (root / 'db/migrations/004_invoice_role_isolation.sql').read_text()
    client = ['psql', '-h', str(tmp), '-p', '6548', '-U', 'postgres' if prefix else pwd.getpwuid(os.getuid()).pw_name, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c']
    setup = 'CREATE ROLE audit_client; CREATE TABLE invoices(id int, tenant_id uuid); ALTER TABLE invoices ENABLE ROW LEVEL SECURITY; GRANT ALL ON invoices TO audit_client;'
    run(client + [setup + migration + helpers + policies])
    run(client + [migration])
    tenant = '00000000-0000-0000-0000-000000000001'
    other = '00000000-0000-0000-0000-000000000002'
    for role, target, allowed in [('viewer', tenant, False), ('accountant', tenant, True), ('tenant_admin', tenant, True), ('accountant', other, False), ('super_admin', other, True)]:
        sql = f"SET ROLE audit_client; SET app.current_tenant_id='{tenant}'; SET app.current_user_role='{role}'; INSERT INTO invoices VALUES(1,'{target}');"
        result = subprocess.run(client + [sql], capture_output=True, text=True, timeout=10)
        assert (result.returncode == 0) == allowed, (role, target, result.stderr)
        if not allowed:
            assert 'row-level security' in result.stderr
        print(f'{role}: insert {"allowed" if allowed else "denied"}; tenant match={target == tenant}')
    sql = f"SET ROLE audit_client; SET app.current_tenant_id='{tenant}'; SET app.current_user_role='viewer'; SELECT count(*) FROM invoices;"
    result = run(client + [sql])
    assert '2' in result.stdout
    print('viewer: reads own two invoices, excludes other tenant')
finally:
    subprocess.run(prefix + [bindir + '/pg_ctl', '-D', str(tmp / 'data'), '-m', 'immediate', 'stop'], capture_output=True, timeout=15)
    shutil.rmtree(tmp)
