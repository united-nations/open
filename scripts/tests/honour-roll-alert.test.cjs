const assert = require('node:assert/strict');
const { test } = require('node:test');
const report = require('../honour-roll-alert.cjs');

function client(issues = [], build = 'failure', deploy = 'skipped') {
  process.env.HONOUR_ROLL_BUILD_RESULT = build;
  process.env.HONOUR_ROLL_DEPLOY_RESULT = deploy;
  const calls = [];
  const api = Object.fromEntries(['listForRepo', 'create', 'createComment', 'update'].map(name => [name, async args => calls.push({ name, args })]));
  const core = { error: message => calls.push({ name: 'error', message }), summary: {
    addHeading() { return this; }, addRaw() { return this; }, async write() {},
  } };
  return { calls, args: { github: { paginate: async () => issues, rest: { issues: api } }, core,
    context: { repo: { owner: 'example', repo: 'portal' }, serverUrl: 'https://github.com', runId: 42 } } };
}

test('failed validation opens a visible incident with the run link', async () => {
  const { args, calls } = client();
  await report(args);
  const created = calls.find(call => call.name === 'create');
  assert.equal(created.args.title, '[data sync] Honour-roll refresh failed');
  assert.match(created.args.body, /https:\/\/github.com\/example\/portal\/actions\/runs\/42/);
  assert.match(created.args.body, /Build: \*\*failure\*\*/);
  assert.ok(calls.some(call => call.name === 'error'));
});

test('each repeated failure comments on the existing incident instead of creating duplicates', async () => {
  const { args, calls } = client([{ number: 7, body: '<!-- honour-roll-sync-incident -->' }]);
  await report(args);
  assert.equal(calls.filter(call => call.name === 'create').length, 0);
  assert.equal(calls.find(call => call.name === 'createComment').args.issue_number, 7);
});

test('deployment failure remains an incident even when validation and build passed', async () => {
  const { args, calls } = client([], 'success', 'failure');
  await report(args);
  assert.ok(calls.some(call => call.name === 'create'));
});

test('only a successful build and deployment closes the incident', async () => {
  const { args, calls } = client([{ number: 7, body: '<!-- honour-roll-sync-incident -->' }], 'success', 'success');
  await report(args);
  assert.equal(calls.find(call => call.name === 'update').args.state, 'closed');
  assert.match(calls.find(call => call.name === 'createComment').args.body, /recovered/);
  assert.equal(calls.filter(call => call.name === 'error').length, 0);
});

test('a healthy run without an incident sends no messages', async () => {
  const { args, calls } = client([], 'success', 'success');
  await report(args);
  assert.deepEqual(calls, []);
});

test('issue API errors propagate instead of silently losing the alert', async () => {
  const { args } = client();
  args.github.rest.issues.create = async () => { throw new Error('Issues permission denied'); };
  await assert.rejects(report(args), /Issues permission denied/);
});
