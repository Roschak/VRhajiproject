const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['tests/journey-browser.cjs'], {
    stdio: 'inherit', env: { ...process.env, ROUTE: 'umrah' }
});
process.exitCode = result.status ?? 1;
