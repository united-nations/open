// A persistent incident plus a notification on each failure; no custom secrets.
module.exports = async function reportHonourRoll({ github, context, core }) {
  const { owner, repo } = context.repo;
  const marker = '<!-- honour-roll-sync-incident -->';
  const title = '[data sync] Honour-roll refresh failed';
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  const failed = process.env.HONOUR_ROLL_BUILD_RESULT !== 'success'
    || process.env.HONOUR_ROLL_DEPLOY_RESULT !== 'success';
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner, repo, state: 'open', creator: 'github-actions[bot]', per_page: 100,
  });
  const issue = issues.find(item => !item.pull_request && item.body?.includes(marker));
  if (failed) {
    const body = `${marker}\nThe nightly honour-roll update failed. Inspect the failed step and its evidence artifact before changing the accepted data.\n\n`
      + `Build: **${process.env.HONOUR_ROLL_BUILD_RESULT}**. Deployment: **${process.env.HONOUR_ROLL_DEPLOY_RESULT}**.\n\n`
      + `[Failed workflow run](${runUrl}). Validation failure prevents data publication; deployment failure leaves the previous website in place.\n\n`
      + 'This issue closes only after a successful sync, build and deployment.';
    core.error(`Honour-roll update failed: ${runUrl}`);
    if (issue) {
      await github.rest.issues.createComment({ owner, repo, issue_number: issue.number, body });
    } else {
      await github.rest.issues.create({ owner, repo, title, body });
    }
    await core.summary.addHeading('Honour-roll update FAILED')
      .addRaw(`Inspect [the failed run](${runUrl}) and the open honour-roll incident issue.\n`).write();
  } else if (issue) {
    await github.rest.issues.createComment({
      owner, repo, issue_number: issue.number,
      body: `Honour-roll sync, build and deployment recovered: [successful run](${runUrl}).`,
    });
    await github.rest.issues.update({ owner, repo, issue_number: issue.number, state: 'closed' });
  }
};
