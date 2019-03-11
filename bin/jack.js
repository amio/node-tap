const { jack, num, opt, list, flag, env } = require('jackspeak')

const osHomedir = require('os-homedir')
const colorSupport = require('color-support')

const reporters = require('tap-mocha-reporter').types.sort()
const fs = require('fs')
// nyc bundles its deps, pull reporters out of it
const nycReporters =
  fs.readdirSync(require.resolve('nyc/package.json')
    .replace(/package.json$/, 'node_modules/istanbul-reports/lib'))
    .sort()

module.exports = main => jack({
  main,
  usage: 'tap [options] <files>',
  help:`
Executes all the files and interprets their output as TAP
formatted test result data.

To parse TAP data from stdin, specify "-" as a filename.

Short options are parsed gnu-style, so for example '-bCRspec' would be
equivalent to '--bail --no-color --reporter=spec'

If the --check-coverage or --coverage-report options are provided, but
no test files are specified, then a coverage report or coverage check
will be run on the data from the last test run.

Coverage is never enabled for stdin.

Much more documentation available at: https://www.node-tap.org/
`,

}, {
  description: 'Basic Options',

  reporter: opt({
    hint: 'type',
    short: 'R',
    default: null,
    valid: reporters,
    description: `Use the specified reporter.  Defaults to
                  'classic' when colors are in use, or 'tap'
                  when colors are disabled.

                  Available reporters:
                  ${reporters.join(' ')}`,
  }),

  bail: flag({
    short: 'b',
    envDefault: 'TAP_BAIL',
    description: 'Bail out on first failure',
    negate: {
      short: 'B',
      description: 'Do not bail out on first failure (default)'
    }
  }),

  comments: flag({
    description: 'Print all tap comments to process.stderr'
  }),

  color: flag({
    short: 'c',
    envDefault: 'TAP_COLORS',
    default: process.stdout.isTTY,
    description: 'Use colors (Default for TTY)',
    negate: {
      short: 'C',
      description: 'Do not use colors (Default for non-TTY)'
    }
  }),

  snapshot: flag({
    short: 'S',
    envDefault: 'TAP_SNAPSHOT',
    default: false,
    description: `Set to generate snapshot files for
                  't.matchSnapshot()' assertions.`,
  }),

  save: opt({
    short: 's',
    hint: 'file',
    default: null,
    description: `If <file> exists, then it should be a line-
                  delimited list of test files to run.  If
                  <file> is not present, then all command-line
                  positional arguments are run.

                  After the set of test files are run, any
                  failed test files are written back to the
                  save file.

                  This way, repeated runs with -s<file> will
                  re-run failures until all the failures are
                  passing, and then once again run all tests.

                  Its a good idea to .gitignore the file
                  used for this purpose, as it will churn a
                  lot.`,
  }),

  only: flag({
    short: 'O',
    envDefault: 'TAP_ONLY',
    description: `Only run tests with {only: true} option,
                  or created with t.only(...) function.`,
  }),

  grep: list({
    hint: 'pattern',
    short: 'g',
    envDefault: 'TAP_GREP',
    delimiter: '\n',
    description: `Only run subtests tests matching the specified
                  pattern.

                  Patterns are matched against top-level
                  subtests in each file.  To filter tests
                  at subsequent levels, specify this
                  option multiple times.

                  To specify regular expression flags,
                  format pattern like a JavaScript RegExp
                  literal.  For example: '/xyz/i' for
                  case-insensitive matching.`,
  }),
  invert: flag({
    envDefault: 'TAP_GREP_INVERT',
    default: false,
    short: 'i',
    description: 'Invert the matches to --grep patterns. (Like grep -v)',
    negate: { short: 'I' }
  }),

  timeout: num({
    min: 0,
    short: 't',
    hint: 'n',
    envDefault: 'TAP_TIMEOUT',
    default: 30,
    description: `Time out test files after <n> seconds.
                  Defaults to 30, or the value of the
                  TAP_TIMEOUT environment variable.
                  Setting to 0 allows tests to run
                  forever.`,
  }),

  'no-timeout': flag({
    short: 'T',
    alias: '--timeout=0',
    description: 'Do not time out tests. Equivalent to --timeout=0.',
  }),

}, {

  description: 'Running Parallel Tests',

  help: `Tap can run multiple test files in parallel.  This generally
         results in a speedier test run, but can also cause problems if
         your test files are not designed to be independent from one
         another.

         To designate a set of files as ok to run in parallel, add them
         to a folder containing a file named 'tap-parallel-ok'.

         To designate a set of files as not ok to run in parallel, add
         them to a folder containing a file named 'tap-parallel-not-ok'.

         These folders may be nested within one another, and tap will
         do the right thing.`,

  jobs: num({
    short: 'j',
    hint: 'n',
    min: 1,
    default: Math.min(require('os').cpus().length, 8),
    description: `Run up to <n> test files in parallel.

                  By default, this will be set to the number of CPUs on
                  the system.

                  Set --jobs=1 to disable parallelization entirely.`
  }),

  'jobs-auto': flag({
    short: 'J',
    alias: '--jobs=' + require('os').cpus().length,
    description: `Run test files in parallel (auto calculated)

                  This is the default as of v13, so this option serves
                  little purpose except to re-set the parallelization
                  back to the default if an early option set it differently.
                  `
  }),

}, {

  description: 'Code Coverage Options',

  help: `Tap uses the nyc module internally to provide code coverage, so
         there is no need to invoke nyc yourself or depend on it
         directly unless you want to use it in other scenarios.`,

  '100': flag({
    alias: [
      '--branches=100',
      '--lines=100',
      '--functions=100',
      '--statements=100'
    ],
    description: `Enforce full coverage, 100%.
                  Sets branches, statements, functions,
                  and lines to 100.

                  This is the default.  To specify a lower limit
                  (or no limit) set --lines, --branches, --functions,
                  or --statements to a lower number than 100, or disable
                  coverage checking with --no-check-coverage, or disable
                  coverage entirely with --no-coverage.`,
  }),

  coverage: flag({
    default: true,
    short: 'cov',
    description: `Capture coverage information using 'nyc'
                  This is enabled by default.

                  If a COVERALLS_REPO_TOKEN environment
                  variable is set, then coverage is
                  sent to the coveralls.io service.`,
    negate: {
      short: 'no-cov',
      description: `Do not capture coverage information.
                    Note that if nyc is already loaded, then
                    the coverage info will still be captured.`,
    }
  }),

  'coverage-report': opt({
    hint: 'type',
    default: null,
    valid: nycReporters,
    description: `Output coverage information using the
                  specified istanbul/nyc reporter type.

                  Default is 'text' when running on the
                  command line, or 'text-lcov' when piping
                  to coveralls.

                  If 'html' is used, then the report will
                  be opened in a web browser after running.

                  This can be run on its own at any time
                  after a test run that included coverage.

                  Available NYC reporters:
                  ${nycReporters.join(' ')}`,
  }),

  'no-coverage-report': flag({
    description: `Do not output a coverage report, even if coverage
                  information is generated.`
  }),

  browser: flag({
    description: `Open a browser when an html coverage report is generated.
                  (this is the default behavior)`,
    default: true,
    negate:  {
      description: `Do not open a web browser after generating
                    an html coverage report`,
    }
  }),

  'show-process-tree': flag({
    description: `Enable coverage and display the tree of
                  spawned processes.`,
    implies: {
      coverage: true
    },
    short: 'pstree',
  }),

}, {
  description: 'Coverage Enfocement Options',
  help: `
    These options enable you to specify that the test will fail
    if a given coverage level is not met.  Setting any of the options
    below will trigger the --coverage and --check-coverage flags.

    The most stringent is --100.  You can find a list of projects
    running their tests like this at: https://www.node-tap.org/100

    If you run tests in this way, please add your project to the list.`,

  'check-coverage': flag({
    description: `Check whether coverage is within
                  thresholds provided.  Setting this
                  explicitly will default --coverage to
                  true.

                  This can be run on its own any time
                  after a test run that included coverage.`,
    implies: {
      coverage: true
    },
  }),

  branches: num({
    min: 0,
    max:100,
    default: 100,
    hint: 'n',
    implies: {
      'check-coverage': true,
      coverage: true
    },
    description: `what % of branches must be covered?`,
  }),

  functions: num({
    min: 0,
    max:100,
    default: 100,
    hint: 'n',
    implies: {
      'check-coverage': true,
      coverage: true
    },
    description: `what % of functions must be covered?`,
  }),

  lines: num({
    min: 0,
    max:100,
    default: 100,
    hint: 'n',
    implies: {
      'check-coverage': true,
      coverage: true
    },
    description: `what % of lines must be covered?`,
  }),

  statements: num({
    min: 0,
    max:100,
    default: 100,
    hint: 'n',
    implies: {
      'check-coverage': true,
      coverage: true
    },
    description: `what % of statements must be covered?`,
  }),

}, {
  description: 'Other Options',

  help: flag({
    short: 'h',
    description: 'Show this helpful output'
  }),

  version: flag({
    short: 'v',
    description: 'Show the version of this program.',
  }),

  'test-regex': opt({
    hint: 'pattern',
    default: '((\\/|^)(tests?|__tests?__)\\/.*|\\.(test|spec))\\.(mjs|[jt]sx?)$',
    description: `A regular expression pattern indicating tests to run if no
                  positional arguments are provided.

                  By default, tap will search for all files ending in
                  .ts, .js, or .mjs, in a top-level folder named test,
                  tests, or __tests__, or any file ending in .spec. or .test.
                  before a js, mjs, or ts extension.

                  Ie, the default value for this option is:
                  ((\\/|^)(tests?|__tests?__)\\/.*|\\.(test|spec))\\.(mj|j|t)s$
                  `
  }),

  'test-ignore': opt({
    hint: 'pattern',
    default: '(\\/|^)(node_modules|tap-snapshots)\\/',
    description: `When no positional arguments are provided, use the supplied
                  regular expression pattern to exclude tests that would
                  otherwise be matched by the test-regexp.

                  Defaults to '(\\/|^)(node_modules|tap-snapshots)\\/',
                  which excludes dependencies and tap-generated snapshots.`,
  }),

  'test-arg': list({
    hint: 'arg',
    description: `Pass an argument to test files spawned
                  by the tap command line executable.
                  This can be specified multiple times to
                  pass multiple args to test scripts.`,
  }),

  'nyc-arg': list({
    hint: 'arg',
    description: `Pass an argument to nyc when running
                  child processes with coverage enabled.
                  This can be specified multiple times to
                  pass multiple args to nyc.`,
  }),

  'node-arg': list({
    hint: 'arg',
    description: `Pass an argument to Node binary in all
                  child processes.  Run 'node --help' to
                  see a list of all relevant arguments.
                  This can be specified multiple times to
                  pass multiple args to Node.`,
  }),
  'expose-gc': flag({
    short: 'gc',
    alias: '--node-arg=--expose-gc',
    description: 'Expose the gc() function to Node.js tests',
  }),
  debug: flag({
    alias: '--node-arg=--debug',
    description: 'Run JavaScript tests with node --debug',
  }),
  'debug-brk': flag({
    alias: '--node-arg=--debug-brk',
    description: 'Run JavaScript tests with node --debug-brk',
  }),
  harmony: flag({
    alias: '--node-arg=--harmony',
    description: 'Enable all Harmony flags in JavaScript tests',
  }),
  strict: flag({
    alias: '--node-arg=--strict',
    description: `Run JS tests in 'use strict' mode`,
  }),

  esm: flag({
    default: process.env.TAP_NO_ESM !== '1',
    description: `Run .js and .mjs with support for EcmaScript modules
                  (Default: true)`,
  }),

  'nyc-help': flag({
    description: `Print nyc usage banner.  Useful for
                  viewing options for --nyc-arg.`,
  }),

  'nyc-version': flag({
    description: 'Print version of nyc used by tap.',
  }),

  'parser-version': flag({
    description: 'Print the version of tap-parser used by tap.',
  }),

  versions: flag({
    description: 'Print versions of tap, nyc, and tap-parser',
  }),

  'dump-config': flag({
    description: 'Dump the config options in YAML format',
  }),

  rcfile: opt({
    hint: 'file',
    description: `Load any of these configurations from a YAML-formatted
                  file at the path specified.  Defaults to .taprc in the
                  current working directory.

                  Run 'tap --dump-config' to see available options and
                  formatting.`,
    envDefault: 'TAP_RCFILE',
    default: `${process.cwd()}/.taprc`,
  }),

  'output-file': opt({
    short: 'o',
    hint: 'file',
    default: null,
    description: `Send the raw TAP output to the specified
                  file.  Reporter output will still be
                  printed to stdout, but the file will
                  contain the raw TAP for later replay or
                  analysis.`,
  }),

  debug: flag({
    envDefault: 'TAP_DEBUG',
    description: 'Turn on debug mode',
  }),

  '--': flag({
    description: `Stop parsing flags, and treat any additional
                  command line arguments as filenames.`
  }),

}, {

  description: 'Environment Variables',

  COVERALLS_REPO_TOKEN: env({
    description: `Set to a Coveralls token to automatically
                  send coverage information to https://coveralls.io`,
    implies: {
      coverage: true
    },
    default: null,
  }),

  TAP_CHILD_ID: env(num({
    description: `Test files have this value set to a
                  numeric value when run through the test
                  runner.  It also appears on the root tap
                  object as \`tap.childId\`.`,
  })),

  TAP_SNAPSHOT: env(flag({
    description: `Set to '1' to generate snapshot files
                  for 't.matchSnapshot()' assertions.`,
  })),

  TAP_RCFILE: env({
    description: `A yaml formatted file which can set any
                  of the above options.  Defaults to
                  ./.taprc`
  }),

  TAP_TIMEOUT: env(num({
    min: 0,
    default: 30,
    description: `Default value for --timeout option.`
  })),

  TAP_COLORS: env(flag({
    description: `Set to '1' to force color output, or '0'
                  to prevent color output.`
  })),

  TAP_BAIL: flag(env({
    description: `Bail out on the first test failure.
                  Used internally when '--bailout' is set.`
  })),

  TAP: flag(env({
    implies: {
      reporter: 'tap'
    },
    description: `Set to '1' to force standard TAP output,
                  and suppress any reporters.  Used when
                  running child tests so that their output
                  is parseable by the test harness.`
  })),

  TAP_DIAG: env(flag({
    description: `Set to '1' to show diagnostics by
                  default for passing tests.  Set to '0'
                  to NOT show diagnostics by default for
                  failing tests.  If not one of these two
                  values, then diagnostics are printed by
                  default for failing tests, and not for
                  passing tests.`
  })),

  TAP_BUFFER: env(flag({
    description: `Set to '1' to run subtests in buffered
                  mode by default.`
  })),

  TAP_DEV_LONGSTACK: env(flag({
    description: `Set to '1' to include node-tap internals
                  in stack traces.  By default, these are
                  included only when the current working
                  directory is the tap project itself.
                  Note that node internals are always
                  excluded.`
  })),

  TAP_DEV_SHORTSTACK: env(flag({
    description: `Set to '1' to exclude node-tap internals
                  in stack traces, even if the current
                  working directory is the tap project
                  itself.`
  })),

  TAP_DEBUG: env(flag({
    description: `Set to '1' to turn on debug mode.`
  })),

  NODE_DEBUG: env({
    description: `Include 'tap' to turn on debug mode.`
  }),

  TAP_GREP: env(list({
    delimiter: '\n',
    description: `A '\\n'-delimited list of grep patterns
                  to apply to root level test objects.
                  (This is an implementation detail for how
                  the '--grep' option works.)`
  })),

  TAP_GREP_INVERT: env(flag({
    description: `Set to '1' to invert the meaning of the
                  patterns in TAP_GREP.  (Implementation
                  detail for how the '--invert' flag
                  works.)`
  })),

  TAP_ONLY: env(flag({
    description: `Set to '1' to set the --only flag`
  })),

  TAP_NO_ESM: env(flag({
    description: `Set to '1' to disable automatic esm support`
  })),

  _TAP_COVERAGE_: env(flag({
    description: `Reserved for internal use.`
  })),

}, {

  // a section that's just a description.  This is totally fine.
  // You can break up the usage output this way.
  description: 'Config Files',
  help: `You can create a yaml file with any of the options above.  By
         default, the file at ./.taprc will be loaded, but the
         TAP_RCFILE environment variable can modify this.

         Run 'tap --dump-config' for a listing of what can be set in that
         file.  Each of the keys corresponds to one of the options above.`,
})
