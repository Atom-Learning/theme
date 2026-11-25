// The plugin list has to vary per branch, which package.json's "release" key
// cannot express. GITHUB_REF_NAME is undefined outside Actions, so a local run
// gets the full main-style plugin set below — that's safe because
// semantic-release forces dry-run outside a recognised CI environment (absent
// --no-ci), so a local run can't write a changelog or push anything regardless
// of which plugins are listed.
const isBeta = process.env.GITHUB_REF_NAME === 'beta'

export default {
  branches: ['main', { name: 'beta', prerelease: true }],
  // The ${...} placeholders below are lodash templates that semantic-release
  // interpolates at release time, not JS template literals. They must stay in
  // single/double-quoted strings — backticks would evaluate them at module
  // load, when nextRelease/etc. don't exist yet, and throw.
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    // Beta is an internal preview channel that never merges back into main, so
    // its changelog entries and release commits would be pure noise.
    ...(isBeta ? [] : ['@semantic-release/changelog']),
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'npm pkg set version=${nextRelease.version}',
        // Publishing goes through exec rather than @semantic-release/npm, so the
        // dist-tag is not handled for us. Without --tag, a prerelease would land
        // on `latest` and reach every consumer. channel is null on main.
        publishCmd: "npm publish --access public --tag ${nextRelease.channel || 'latest'}"
      }
    ],
    ...(isBeta
      ? []
      : [
          [
            '@semantic-release/git',
            {
              assets: ['CHANGELOG.md', 'package.json'],
              message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
            }
          ]
        ]),
    // Beta cuts a GitHub release on every push and main cuts one per batch, so
    // a commit referencing a PR would get commented on twice: once on beta, once
    // again when it reaches main. successCommentCondition: false silences that
    // per-issue/PR comment and, with it, the "released" label applied in the same
    // loop — the release itself still gets created either way.
    // failCommentCondition keeps beta out of the shared "release is failing"
    // issue in both directions: without it a successful beta would close an
    // issue raised by a failing main release, and a failing beta would raise one
    // that reads as main being broken.
    isBeta
      ? [
          '@semantic-release/github',
          { successCommentCondition: false, failCommentCondition: false }
        ]
      : '@semantic-release/github',
    // Only main notifies. The plugin is left out on beta altogether, because it
    // refuses to start without SLACK_WEBHOOK even when it has nothing to send.
    ...(isBeta
      ? []
      : [
          [
            'semantic-release-slack-bot',
            {
              packageName: '@atom-learning/theme',
              branchesConfig: [
                {
                  pattern: 'main',
                  notifyOnFail: true,
                  notifyOnSuccess: true
                }
              ]
            }
          ]
        ])
  ]
}
