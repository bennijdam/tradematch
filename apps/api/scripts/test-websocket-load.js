const WebSocket = require('ws');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const CONCURRENT_CONNECTIONS = parseInt(process.env.CONCURRENT_CONNECTIONS || '50');
const MESSAGE_INTERVAL = parseInt(process.env.MESSAGE_INTERVAL || '1000'); // ms
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '60000'); // ms (1 minute)

// Test users (these would need to be valid test users in your system)
const testUsers = [
  // Add your test user tokens here
  // { token: 'valid_jwt_token_1', userId: 'user_1' },
  // { token: 'valid_jwt_token_2', userId: 'user_2' },
];

console.log(`🧪 WebSocket Load Test Configuration:`);
console.log(`  URL: ${WS_URL}`);
console.log(`  Concurrent Connections: ${CONCURRENT_CONNECTIONS}`);
console.log(`  Message Interval: ${MESSAGE_INTERVAL}ms`);
console.log(`  Test Duration: ${TEST_DURATION}ms`);

// Statistics
let stats = {
  connections: 0,
  disconnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  startTime: Date.now()
};

// Active connections
const connections = [];

// Create WebSocket connections
async function createConnections(count) {
  console.log(`🔌 Creating ${count} WebSocket connections...`);
  
  for (let i = 0; i < count; i++) {
    try {
      // In a real test, you would use actual JWT tokens
      const ws = new WebSocket(`${WS_URL}?token=test_token_${i}`);
      
      ws.on('open', () => {
        stats.connections++;
        console.log(`✅ Connection ${i + 1} opened`);
        
        // Send periodic ping messages
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            stats.messagesSent++;
          }
        }, MESSAGE_INTERVAL);
        
        // Store reference for cleanup
        connections.push({ ws, pingInterval });
      });
      
      ws.on('message', (data) => {
        stats.messagesReceived++;
        // Don't log every message to avoid spam
        if (stats.messagesReceived % 100 === 0) {
          console.log(`📨 Messages received: ${stats.messagesReceived}`);
        }
      });
      
      ws.on('error', (error) => {
        stats.errors++;
        console.error(`❌ Connection ${i + 1} error:`, error.message);
      });
      
      ws.on('close', () => {
        stats.disconnections++;
        console.log(`🔒 Connection ${i + 1} closed`);
      });
      
      // Small delay between connections to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      stats.errors++;
      console.error(`❌ Failed to create connection ${i + 1}:`, error.message);
    }
  }
}

// Close all connections
function closeConnections() {
  console.log('🧹 Closing all connections...');
  connections.forEach(({ ws, pingInterval }) => {
    clearInterval(pingInterval);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
}

// Print statistics periodically
function printStats() {
  const elapsed = Date.now() - stats.startTime;
  const elapsedSec = Math.floor(elapsed / 1000);
  
  console.log(`📊 Stats after ${elapsedSec}s:`);
  console.log(`  Active Connections: ${stats.connections - stats.disconnections}`);
  console.log(`  Total Connections: ${stats.connections}`);
  console.log(`  Disconnections: ${stats.disconnections}`);
  console.log(`  Messages Sent: ${stats.messagesSent}`);
  console.log(`  Messages Received: ${stats.messagesReceived}`);
  console.log(`  Errors: ${stats.errors}`);
}

// Run the test
async function runTest() {
  console.log('🚀 Starting WebSocket load test...');
  
  // Create connections
  await createConnections(CONCURRENT_CONNECTIONS);
  
  // Print stats periodically
  const statsInterval = setInterval(printStats, 10000);
  
  // Run test for specified duration
  setTimeout(() => {
    console.log('⏰ Test duration completed');
    clearInterval(statsInterval);
    closeConnections();
    
    // Final stats
    printStats();
    
    console.log('✅ WebSocket load test completed');
    process.exit(0);
  }, TEST_DURATION);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  closeConnections();
  process.exit(0);
});

// Start the test
runTest().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});