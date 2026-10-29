// Crash-test hook: when FAULT_POINT names this point the process dies on the spot (no cleanup, open transaction is
// abandoned, PostgreSQL rolls it back). Used by tests/integration/faults.test.js to kill the real worker around commits.
// No effect unless FAULT_POINT is set; never set it outside tests.
export function faultPoint(name: string): void {
  if (process.env.FAULT_POINT === name) {
    process.stderr.write(`FAULT_POINT ${name}: exiting\n`);
    process.exit(86);
  }
}
