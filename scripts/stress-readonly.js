const { performance } = require("node:perf_hooks");

const SCENARIOS = {
  health: { path: "/api/health", requiresSession: false },
  "health-db": { path: "/api/health/database", requiresSession: false },
  catalog: { path: "/api/public/catalog", requiresSession: false },
  "auth-session": { path: "/api/auth/session", requiresSession: false },
  "private-state": { path: "/api/private/state", requiresSession: true },
  "private-state-no-session": {
    path: "/api/private/state",
    requiresSession: false,
    expectedStatus: 401,
  },
};
const CONCURRENCY_LEVELS = [5, 15, 30];
const MAX_REPETITIONS = 3;
const MAX_TIMEOUT_MS = 10_000;
const STOP_P95_MS = 5_000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function readConfig() {
  const targetEnv = process.env.LOAD_TEST_TARGET_ENV || "local";
  if (!["local", "staging"].includes(targetEnv)) {
    throw new Error("Only local and staging targets are allowed; production is disabled.");
  }

  const baseUrlValue = process.env.LOAD_TEST_BASE_URL;
  if (!baseUrlValue) {
    throw new Error("Set LOAD_TEST_BASE_URL to an explicitly selected local or staging URL.");
  }

  const baseUrl = new URL(baseUrlValue);
  if (!["http:", "https:"].includes(baseUrl.protocol) ||
      baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash ||
      baseUrl.pathname !== "/") {
    throw new Error("LOAD_TEST_BASE_URL must be an origin only, without credentials, path, query, or fragment.");
  }

  const host = baseUrl.hostname.toLowerCase();
  if (targetEnv === "local" && !LOCAL_HOSTS.has(host)) {
    throw new Error("Local mode only permits localhost, 127.0.0.1, or ::1.");
  }
  if (targetEnv === "staging") {
    if (baseUrl.protocol !== "https:") {
      throw new Error("Remote staging must use HTTPS.");
    }
    if (process.env.LOAD_TEST_APPROVED_HOST?.toLowerCase() !== host ||
        process.env.LOAD_TEST_CONFIRM_STAGING !== "I_HAVE_AUTHORIZATION") {
      throw new Error("Staging requires an exact LOAD_TEST_APPROVED_HOST match and LOAD_TEST_CONFIRM_STAGING=I_HAVE_AUTHORIZATION.");
    }
  }

  const scenarioName = process.env.LOAD_TEST_SCENARIO || "catalog";
  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    throw new Error(`Unknown LOAD_TEST_SCENARIO. Choose: ${Object.keys(SCENARIOS).join(", ")}.`);
  }

  const repetitions = Number(process.env.LOAD_TEST_REPETITIONS || 1);
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > MAX_REPETITIONS) {
    throw new Error(`LOAD_TEST_REPETITIONS must be an integer from 1 to ${MAX_REPETITIONS}.`);
  }

  const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 5_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`LOAD_TEST_TIMEOUT_MS must be an integer from 1000 to ${MAX_TIMEOUT_MS}.`);
  }

  const expectedStatusDefault = scenario.expectedStatus ||
    (scenarioName === "private-state" && !process.env.LOAD_TEST_SESSION_TOKEN ? 401 : 200);
  const expectedStatus = Number(process.env.LOAD_TEST_EXPECTED_STATUS || expectedStatusDefault);
  if (!Number.isInteger(expectedStatus) ||
      ![200, 401, 403, 429].includes(expectedStatus)) {
    throw new Error("LOAD_TEST_EXPECTED_STATUS must be one of 200, 401, 403, or 429.");
  }

  const sessionToken = process.env.LOAD_TEST_SESSION_TOKEN || "";
  if (sessionToken && !/^[\da-f]{64}$/i.test(sessionToken)) {
    throw new Error("LOAD_TEST_SESSION_TOKEN must be the 64-character session token; its value is never printed.");
  }
  if (sessionToken && !["auth-session", "private-state"].includes(scenarioName)) {
    throw new Error("A session token is accepted only for auth-session or private-state scenarios.");
  }
  if (sessionToken && targetEnv === "local") {
    return {
      targetEnv,
      baseUrl,
      scenarioName,
      scenario,
      repetitions,
      timeoutMs,
      expectedStatus,
      sessionToken,
      cookieName: "portfolio_session",
    };
  }

  return {
    targetEnv,
    baseUrl,
    scenarioName,
    scenario,
    repetitions,
    timeoutMs,
    expectedStatus,
    sessionToken,
    cookieName: "__Host-portfolio_session",
  };
}

function percentile95(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

function summarize(results, expectedStatus) {
  const latencies = results.map((result) => result.elapsedMs);
  const statusCounts = {};
  const errorCounts = { timeout: 0, connection: 0 };

  for (const result of results) {
    if (result.error) {
      errorCounts[result.error] += 1;
    } else {
      const label = result.status >= 500 ? "5xx" : String(result.status);
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    }
  }

  const expected = results.filter((result) => result.status === expectedStatus && !result.error).length;
  const httpOk = results.filter((result) => result.status >= 200 && result.status < 300 && !result.error).length;
  const p95Ms = percentile95(latencies);
  return {
    requests: results.length,
    averageMs: latencies.length
      ? Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(1))
      : null,
    p95Ms: p95Ms === null ? null : Number(p95Ms.toFixed(1)),
    maxMs: latencies.length ? Number(Math.max(...latencies).toFixed(1)) : null,
    statusCounts,
    errors: errorCounts,
    expectedStatusRate: results.length ? Number(((expected / results.length) * 100).toFixed(1)) : 0,
    http2xxRate: results.length ? Number(((httpOk / results.length) * 100).toFixed(1)) : 0,
  };
}

async function requestOnce(config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = performance.now();

  try {
    const headers = { accept: "application/json" };
    if (config.sessionToken) {
      headers.cookie = `${config.cookieName}=${config.sessionToken}`;
    }
    const response = await fetch(new URL(config.scenario.path, config.baseUrl), {
      method: "GET",
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
    for await (const _chunk of response.body || []) {
      // Drain the response without storing potentially private data.
    }
    return { status: response.status, elapsedMs: performance.now() - startedAt };
  } catch (error) {
    const isTimeout = error.name === "AbortError" || error.name === "TimeoutError";
    return {
      error: isTimeout ? "timeout" : "connection",
      elapsedMs: performance.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function run() {
  const config = readConfig();
  if (config.scenario.requiresSession && !config.sessionToken && config.expectedStatus !== 401) {
    throw new Error("A session token is required for an authenticated private-state test.");
  }
  if (config.scenario.requiresSession && config.sessionToken && config.expectedStatus !== 200) {
    throw new Error("An authenticated private-state test expects HTTP 200.");
  }

  const waveSummaries = [];
  let stoppedEarly = false;
  for (const concurrency of CONCURRENCY_LEVELS) {
    const waveResults = [];
    for (let repetition = 0; repetition < config.repetitions; repetition += 1) {
      const results = await Promise.all(
        Array.from({ length: concurrency }, () => requestOnce(config)),
      );
      waveResults.push(...results);
      if (repetition + 1 < config.repetitions) await delay(500);
    }

    const summary = summarize(waveResults, config.expectedStatus);
    waveSummaries.push({ concurrency, ...summary });
    const serverErrors = waveResults.filter((result) => result.status >= 500).length;
    const transportErrors = waveResults.filter((result) => result.error).length;
    const unexpectedStatuses = waveResults.filter((result) => result.status && result.status !== config.expectedStatus).length;
    if (serverErrors > 0 || transportErrors > 0 || unexpectedStatuses > 0 || summary.p95Ms > STOP_P95_MS) {
      stoppedEarly = true;
      break;
    }
    await delay(1_000);
  }

  console.log(JSON.stringify({
    targetEnvironment: config.targetEnv,
    targetOrigin: config.baseUrl.origin,
    scenario: config.scenarioName,
    path: config.scenario.path,
    expectedStatus: config.expectedStatus,
    repetitionsPerLevel: config.repetitions,
    maxRequests: CONCURRENCY_LEVELS.reduce((sum, level) => sum + level, 0) * config.repetitions,
    completedWaves: waveSummaries,
    stoppedEarly,
    stopRules: {
      serverErrors: "stop after any 5xx in a wave",
      transportErrors: "stop after any timeout or connection error in a wave",
      unexpectedStatuses: "stop after any response different from the expected status",
      p95Ms: STOP_P95_MS,
    },
    privateBodiesLogged: false,
    sessionTokenLogged: false,
  }, null, 2));
  if (stoppedEarly) process.exitCode = 1;
}

run().catch((error) => {
  console.error(`Read-only load test not started or incomplete: ${error.message}`);
  process.exitCode = 1;
});
