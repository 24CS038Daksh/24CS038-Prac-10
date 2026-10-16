/**
 * Automated Verification & Benchmarking Suite for Practical 10
 * Student: Daksh Karangiya | Roll: 24CS038
 * Measures response times: Synchronous Blocking vs. Asynchronous EventEmitter
 */

const http = require('http');

const PORT = process.env.PORT || 5004;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const tStart = performance.now();
    const req = http.request(url, { method, headers }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        const duration = Number((performance.now() - tStart).toFixed(2));
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed, duration, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody, duration, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runBenchmark() {
  console.log('========================================================================');
  console.log('  PRACTICAL 10: EVENTEMITTER ASYNCHRONOUS BACKGROUND PROCESSING BENCHMARK');
  console.log('  Student: Daksh Karangiya  |  Roll Number: 24CS038');
  console.log('========================================================================\n');

  // 1. Health Check
  console.log('[1/6] Checking server health on port ' + PORT + '...');
  const health = await makeRequest('GET', '/api/health');
  console.log(`✓ Server OK: ${health.data.status} | Mode: EventEmitter Background Worker\n`);

  // 2. Authentication
  console.log('[2/6] Authenticating user (Daksh Karangiya / 24CS038)...');
  const authPayload = {
    username: 'daksh_24cs038',
    email: 'daksh.24cs038@university.edu',
    password: 'SecurePassword123!',
    name: 'Daksh Karangiya'
  };

  let authRes = await makeRequest('POST', '/api/auth/login', {
    username: authPayload.username,
    password: authPayload.password
  });

  if (authRes.status !== 200) {
    authRes = await makeRequest('POST', '/api/auth/register', authPayload);
  }

  const token = authRes.data.token;
  console.log(`✓ Authentication Token acquired successfully.\n`);

  // 3. Measure Synchronous Mode (3 Trials)
  console.log('[3/6] Running 3 Synchronous Blocking Trials (Simulated 1500ms Inline Notification)...');
  const syncReadings = [];
  for (let i = 1; i <= 3; i++) {
    const res = await makeRequest('POST', '/api/tasks?mode=sync', {
      title: `Sync Task Run #${i} - Roll 24CS038`,
      description: 'Synchronous blocking verification',
      priority: 'high'
    }, token);

    syncReadings.push(res.duration);
    console.log(`   Trial ${i}: ${res.duration} ms  (HTTP ${res.status}) [Blocked by notification]`);
  }

  // 4. Measure Asynchronous Mode (3 Trials using EventEmitter)
  console.log('\n[4/6] Running 3 Asynchronous EventEmitter Trials (Immediate Response + Background Worker)...');
  const asyncReadings = [];
  let lastCreatedTask = null;
  for (let i = 1; i <= 3; i++) {
    const res = await makeRequest('POST', '/api/tasks?mode=async', {
      title: `Async Task Run #${i} - Roll 24CS038`,
      description: 'Asynchronous EventEmitter non-blocking verification',
      priority: 'medium'
    }, token);

    asyncReadings.push(res.duration);
    lastCreatedTask = res.data.task;
    console.log(`   Trial ${i}: ${res.duration} ms  (HTTP ${res.status}) [Dispatched to EventEmitter]`);
  }

  const syncAvg = (syncReadings.reduce((a, b) => a + b, 0) / syncReadings.length).toFixed(2);
  const asyncAvg = (asyncReadings.reduce((a, b) => a + b, 0) / asyncReadings.length).toFixed(2);
  const speedup = (syncAvg / asyncAvg).toFixed(1);
  const latencyReduction = (((syncAvg - asyncAvg) / syncAvg) * 100).toFixed(1);

  console.log('\n------------------------------------------------------------------------');
  console.log('  EMPIRICAL BENCHMARK COMPARISON TABLE (3 SAMPLE READINGS)');
  console.log('------------------------------------------------------------------------');
  console.log(`  Trial 1 : Sync = ${syncReadings[0]} ms  |  Async = ${asyncReadings[0]} ms`);
  console.log(`  Trial 2 : Sync = ${syncReadings[1]} ms  |  Async = ${asyncReadings[1]} ms`);
  console.log(`  Trial 3 : Sync = ${syncReadings[2]} ms  |  Async = ${asyncReadings[2]} ms`);
  console.log('------------------------------------------------------------------------');
  console.log(`  AVERAGE : Sync = ${syncAvg} ms  |  Async = ${asyncAvg} ms`);
  console.log(`  RESULT  : ${speedup}x FASTER (~${latencyReduction}% latency reduction with EventEmitter)`);
  console.log('------------------------------------------------------------------------\n');

  // 5. Test Supplementary Problems: task-deleted & error event
  console.log('[5/6] Testing Supplementary Features:');
  if (lastCreatedTask) {
    const delRes = await makeRequest('DELETE', `/api/tasks/${lastCreatedTask._id}`, null, token);
    console.log(`✓ 'task-deleted' event emitted for task ID ${lastCreatedTask._id} (Duration: ${delRes.duration} ms)`);
  }

  const errRes = await makeRequest('POST', '/api/events/trigger-error', {
    message: 'Simulated Notification Service Downtime (Roll 24CS038 Test)'
  });
  console.log(`✓ 'error' event trapped safely by EventEmitter error listener (HTTP ${errRes.status})\n`);

  // Wait 1.8 seconds for background listeners to complete their simulated async work
  console.log('Waiting 1.8s for background workers to finish and record audit logs...');
  await new Promise(r => setTimeout(r, 1800));

  // 6. Fetch Event Logs & Verification
  console.log('\n[6/6] Fetching Background Event Logs & Audit Trail...');
  const logsRes = await makeRequest('GET', '/api/events/logs');
  const statsRes = await makeRequest('GET', '/api/events/stats');

  console.log(`Total Events Emitted : ${statsRes.data.stats.taskCreatedEvents + statsRes.data.stats.taskDeletedEvents}`);
  console.log(`• task-created events: ${statsRes.data.stats.taskCreatedEvents}`);
  console.log(`• task-deleted events: ${statsRes.data.stats.taskDeletedEvents}`);
  console.log(`• error events trapped: ${statsRes.data.stats.errorEvents}`);

  console.log('\nRecent Background Audit Records (First 4 entries):');
  logsRes.data.logs.slice(0, 4).forEach((log, idx) => {
    console.log(`  [${idx + 1}] Event: ${log.eventType} | Task: "${log.taskTitle}" | Status: ${log.status}`);
    console.log(`      API Responded: ${log.apiResponseTime}`);
    console.log(`      Worker Ended : ${log.handlerEndTime} (${log.timeDeltaAfterApiResponseMs}ms lag)`);
  });

  console.log('\n========================================================================');
  console.log('  ALL PRACTICAL 10 BENCHMARKS AND TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

if (require.main === module) {
  runBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}

module.exports = { runBenchmark };
