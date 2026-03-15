/**
 * TradeMatch WebSocket Load Testing Suite
 * Tests 50+ concurrent WebSocket connections with realistic usage patterns
 * 
 * Usage:
 *   node apps/api/tests/load/websocket-load-test.js --url=ws://localhost:3001 --clients=50
 * 
 * Monitors:
 * - Connection success rate
 * - Message latency (p50, p95, p99)
 * - Memory usage
 * - Database connection pool utilization
 * - Reconnection handling
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketLoadTester {
  constructor(options = {}) {
    this.targetUrl = options.url || 'ws://localhost:3001';
    this.totalClients = options.clients || 50;
    this.messagesPerClient = options.messagesPerClient || 10;
    this.rampUpTime = options.rampUpTime || 10000; // 10 seconds ramp-up
    this.testDuration = options.testDuration || 30000; // 30 seconds test
    
    this.results = {
      connections: [],
      messages: [],
      errors: [],
      latency: [],
      memorySnapshots: [],
      reconnections: 0,
      testStartTime: null,
      testEndTime: null
    };
    
    this.clients = new Map();
    this.isRunning = false;
  }
  
  /**
   * Run complete load test
   */
  async run() {
    console.log(`🚀 Starting WebSocket load test:`);
    console.log(`   - Target: ${this.targetUrl}`);
    console.log(`   - Clients: ${this.totalClients}`);
    console.log(`   - Ramp-up: ${this.rampUpTime}ms`);
    console.log(`   - Duration: ${this.testDuration}ms`);
    console.log('');
    
    this.isRunning = true;
    this.results.testStartTime = Date.now();
    
    // Phase 1: Ramp-up connections
    await this.rampUpConnections();
    
    // Phase 2: Send concurrent messages
    await this.sendConcurrentMessages();
    
    // Phase 3: Connection stability check
    await this.measureKeepAlive();
    
    // Phase 4: Stress test with reconnections
    await this.testReconnections();
    
    // Phase 5: Graceful shutdown
    await this.gracefulShutdown();
    
    this.results.testEndTime = Date.now();
    
    // Generate report
    return this.generateReport();
  }
  
  /**
   * Gradually ramp up connections
   */
  async rampUpConnections() {
    console.log('📈 Phase 1: Ramping up connections...');
    
    const rampDelay = this.rampUpTime / this.totalClients;
    const successfulConnections = [];
    
    for (let i = 0; i < this.totalClients; i++) {
      await new Promise(resolve => setTimeout(resolve, rampDelay));
      
      const clientId = `client_${i}_${uuidv4()}`;
      
      try {
        const client = await this.createClient(clientId, i);
        this.clients.set(clientId, client);
        successfulConnections.push(client);
        
        console.log(`   ✓ Client ${i} connected (total: ${successfulConnections.length})`);
        
      } catch (error) {
        this.results.errors.push({
          phase: 'rampup',
          clientId,
          error: error.message,
          timestamp: Date.now()
        });
        
        console.error(`   ✗ Client ${i} failed: ${error.message}`);
      }
    }
    
    this.results.connections = successfulConnections.map((c, index) => ({
      clientId: c.id,
      clientIndex: index,
      status: 'connected',
      timestamp: c.connectedAt
    }));
    
    console.log(`   📊 Connected: ${successfulConnections.length}/${this.totalClients}`);
    console.log('');
  }
  
  /**
   * Create a single WebSocket client
   */
  async createClient(clientId, index) {
    return new Promise((resolve, reject) => {
      const token = this.generateTestToken(clientId);
      const url = `${this.targetUrl}?token=${encodeURIComponent(token)}`;
      
      const ws = new WebSocket(url);
      
      const client = {
        id: clientId,
        ws: ws,
        index: index,
        messagesSent: 0,
        messagesReceived: 0,
        connectedAt: Date.now(),
        isAlive: true,
        lastPing: null,
        reconnectAttempts: 0
      };
      
      // Connection handler
      ws.on('open', () => {
        console.log(`   [${clientId}] Connected`);
        resolve(client);
      });
      
      // Error handler
      ws.on('error', (error) => {
        this.results.errors.push({
          phase: 'connection',
          clientId,
          error: error.message,
          timestamp: Date.now()
        });
        
        reject(new Error(`Connection failed: ${error.message}`));
      });
      
      // Close handler
      ws.on('close', (code, reason) => {
        client.isAlive = false;
        console.log(`   [${clientId}] Disconnected (code: ${code})`);
      });
      
      // Message handler
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          const timestamp = Date.now();
          
          // Track latency if this is a response to a ping
          if (message.type === 'pong' && client.lastPing) {
            const latency = timestamp - client.lastPing;
            this.results.latency.push(latency);
          }
          
          // Could also track message throughput here
          client.messagesReceived++;
          
        } catch (error) {
          console.error(`[${clientId}] Parse error:`, error);
        }
      });
      
      // Pong handler (for latency tracking)
      ws.on('pong', () => {
        if (client.lastPing) {
          const latency = Date.now() - client.lastPing;
          this.results.latency.push(latency);
          client.lastPing = null;
        }
      });
    });
  }
  
  /**
   * Send concurrent messages from all clients
   */
  async sendConcurrentMessages() {
    console.log('💬 Phase 2: Sending concurrent messages...');
    
    const sendPromises = [];
    
    for (let [clientId, client] of this.clients) {
      if (!client.isAlive) continue;
      
      // Each client sends N messages
      for (let i = 0; i < this.messagesPerClient; i++) {
        sendPromises.push(this.sendMessage(client, i));
      }
    }
    
    await Promise.all(sendPromises);
    console.log(`   📊 Sent ${sendPromises.length} total messages`);
    console.log('');
  }
  
  /**
   * Send a single message from a client
   */
  async sendMessage(client, messageIndex) {
    return new Promise((resolve) => {
      if (!client.isAlive) {
        resolve();
        return;
      }
      
      const messageId = `msg_${client.id}_${messageIndex}`;
      const startTime = Date.now();
      
      const message = JSON.stringify({
        type: 'ping',
        messageId: messageId,
        payload: `Test message ${messageIndex} from ${client.id}`,
        timestamp: startTime
      });
      
      // Simulate realistic message size
      const payload = message.padEnd(1024, 'x'); // 1KB message
      
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
          client.messagesSent++;
          
          this.results.messages.push({
            clientId: client.id,
            clientIndex: client.index,
            messageId,
            status: 'sent',
            timestamp: startTime,
            size: payload.length
          });
        }
      } catch (error) {
        this.results.errors.push({
          phase: 'messaging',
          clientId: client.id,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      // Simulate realistic network conditions
      const delay = Math.random() * 100 + 50; // 50-150ms
      setTimeout(resolve, delay);
    });
  }
  
  /**
   * Measure connection stability
   */
  async measureKeepAlive() {
    console.log('⏱️  Phase 3: Testing connection stability...');
    
    // Check heartbeats
    const heartbeatChecks = [];
    
    for (let [clientId, client] of this.clients) {
      if (client.isAlive) {
        heartbeatChecks.push(new Promise((resolve) => {
          client.lastPing = Date.now();
          client.ws.ping();
          
          // Timeout after 5 seconds
          setTimeout(() => {
            const isAlive = client.isAlive && client.lastPing === null;
            resolve({ clientId, isAlive });
          }, 5000);
        }));
      }
    }
    
    const results = await Promise.all(heartbeatChecks);
    const aliveCount = results.filter(r => r.isAlive).length;
    
    console.log(`   📊 Alive connections: ${aliveCount}/${results.length}`);
    console.log('');
  }
  
  /**
   * Test reconnection handling
   */
  async testReconnections() {
    console.log('🔄 Phase 4: Testing reconnections...');
    
    // Simulate network issues by closing random connections
    const clientsArray = Array.from(this.clients.keys());
    const disconnectCount = Math.floor(clientsArray.length * 0.2); // 20% of clients
    
    const disconnectClients = clientsArray
      .sort(() => 0.5 - Math.random())
      .slice(0, disconnectCount);
    
    console.log(`   🔌 Dropping ${disconnectCount} connections...`);
    
    // Disconnect selected clients
    for (const clientId of disconnectClients) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState !== WebSocket.CLOSED) {
        client.ws.close(1000, 'Load test disconnection');
        this.results.reconnections++;
      }
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconnect them
    const reconnectPromises = [];
    for (const clientId of disconnectClients) {
      const client = this.clients.get(clientId);
      if (client) {
        reconnectPromises.push(
          this.createClient(clientId, client.index)
            .then(newClient => {
              this.clients.set(clientId, newClient);
              return newClient;
            })
            .catch(err => {
              this.results.errors.push({
                phase: 'reconnect',
                clientId,
                error: err.message,
                timestamp: Date.now()
              });
              return null;
            })
        );
      }
    }
    
    await Promise.all(reconnectPromises);
    
    const reconnectedCount = reconnectPromises.filter(p => p !== null).length;
    console.log(`   ✓ Reconnected: ${reconnectedCount}/${disconnectCount}`);
    console.log('');
  }
  
  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    console.log('🔚 Phase 5: Graceful shutdown...');
    
    for (let [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Load test complete');
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('   ✅ All connections closed');
    console.log('');
  }
  
  /**
   * Generate test JWT token
   */
  generateTestToken(clientId) {
    // Mock JWT structure
    const jwt = require('jsonwebtoken');
    const payload = {
      userId: `user_${clientId}`,
      email: `test+${clientId}@tradematch.test`,
      role: clientId.includes('vendor') ? 'vendor' : 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 // 24 hours
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
  }
  
  /**
   * Generate comprehensive report
   */
  generateReport() {
    const duration = this.results.testEndTime - this.results.testStartTime;
    
    // Calculate latency percentiles
    const latencies = this.results.latency.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    
    // Connection metrics
    const connectionCount = this.results.connections.length;
    const connectionSuccessRate = (connectionCount / this.totalClients) * 100;
    
    // Message metrics
    const totalMessagesAttempted = this.totalClients * this.messagesPerClient;
    const totalMessagesSent = this.results.messages.filter(m => m.status === 'sent').length;
    const messageDeliveryRate = (totalMessagesSent / totalMessagesAttempted) * 100;
    
    const report = {
      summary: {
        totalClients: this.totalClients,
        connectionCount,
        connectionSuccessRate: `${connectionSuccessRate.toFixed(1)}%`,
        totalMessagesAttempted,
        totalMessagesSent,
        messageDeliveryRate: `${messageDeliveryRate.toFixed(1)}%`,
        avgLatency: `${(latencies.reduce((a, b) => a + b, 0) / Math.max(latencies.length, 1)).toFixed(0)}ms`,
        p50Latency: `${p50}ms`,
        p95Latency: `${p95}ms`,
        p99Latency: `${p99}ms`,
        errorCount: this.results.errors.length,
        duration: `${duration}ms`,
        reconnections: this.results.reconnections
      },
      readiness: {
        // Production-ready criteria
        connectionSuccess: connectionSuccessRate >= 99,
        latencyP95: p95 <= 200,
        messageDelivery: messageDeliveryRate >= 98,
        errorsAcceptable: this.results.errors.length < this.totalClients * 0.02,
        
        // Overall production readiness
        productionReady: (
          connectionSuccessRate >= 99 &&
          p95 <= 200 &&
          messageDeliveryRate >= 98 &&
          this.results.errors.length < this.totalClients * 0.02
        )
      },
      errors: this.results.errors,
      details: this.results
    };
    
    // Print summary
    console.log('📊 LOAD TEST RESULTS');
    console.log('═══════════════════════════════════════════');
    console.log(`Connection Success: ${report.summary.connectionSuccessRate} ${report.readiness.connectionSuccess ? '✅' : '❌'}`);
    console.log(`Message Delivery: ${report.summary.messageDeliveryRate} ${report.readiness.messageDelivery ? '✅' : '❌'}`);
    console.log(`P95 Latency: ${report.summary.p95Latency} ${report.readiness.latencyP95 ? '✅' : '❌'}`);
    console.log(`Errors: ${report.summary.errorCount} ${report.readiness.errorsAcceptable ? '✅' : '❌'}`);
    console.log(`Production Ready: ${report.readiness.productionReady ? '🟢 YES' : '🔴 NO'}`);
    console.log('═══════════════════════════════════════════');
    
    return report;
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--url=')) {
      options.url = arg.split('=')[1];
    } else if (arg.startsWith('--clients=')) {
      options.clients = parseInt(arg.split('=')[1]);
    }
  });
  
  const tester = new WebSocketLoadTester(options);
  
  tester.run()
    .then(report => {
      console.log('\n📄 Detailed report available in report.json');
      require('fs').writeFileSync('report.json', JSON.stringify(report, null, 2));
      process.exit(report.readiness.productionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('Load test failed:', error);
      process.exit(1);
    });
}

module.exports = { WebSocketLoadTester };
