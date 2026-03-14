const express = require('express');
const router = express.Router();

/**
 * Sentry Webhook Endpoint
 * Receives alerts from Sentry for issues, errors, and events
 * POST /sentry/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const { action, data, actor } = req.body;
    
    console.log('📨 Sentry Webhook Received:', {
      action,
      timestamp: new Date().toISOString(),
      project: data?.project?.name,
      actor: actor?.name
    });

    // Handle different event types
    switch (action) {
      case 'issue_created':
        await handleIssueCreated(data);
        break;
        
      case 'issue_resolved':
        await handleIssueResolved(data);
        break;
        
      case 'issue_ignored':
        await handleIssueIgnored(data);
        break;
        
      case 'error_created':
        await handleErrorCreated(data);
        break;
        
      case 'comment_created':
        await handleCommentCreated(data);
        break;
        
      default:
        console.log('ℹ️  Unhandled Sentry action:', action);
    }

    res.status(200).json({ 
      success: true, 
      received: true,
      action: action 
    });
    
  } catch (error) {
    console.error('❌ Sentry webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Handle new issue created
async function handleIssueCreated(data) {
  const issue = data.issue;
  console.log('🐛 New Issue Created:', {
    id: issue.id,
    title: issue.title,
    level: issue.level,
    culprit: issue.culprit,
    url: issue.web_url
  });
  
  // TODO: Send notification to Slack/Discord/Email
  // await sendNotification({
  //   type: 'error',
  //   title: issue.title,
  //   url: issue.web_url,
  //   level: issue.level
  // });
}

// Handle issue resolved
async function handleIssueResolved(data) {
  const issue = data.issue;
  console.log('✅ Issue Resolved:', {
    id: issue.id,
    title: issue.title,
    resolvedBy: data.actor?.name
  });
}

// Handle issue ignored
async function handleIssueIgnored(data) {
  const issue = data.issue;
  console.log('🚫 Issue Ignored:', {
    id: issue.id,
    title: issue.title
  });
}

// Handle new error
async function handleErrorCreated(data) {
  const error = data.error;
  console.log('💥 New Error:', {
    id: error.id,
    title: error.title,
    level: error.level
  });
}

// Handle new comment
async function handleCommentCreated(data) {
  const comment = data.comment;
  console.log('💬 New Comment:', {
    id: comment.id,
    text: comment.text?.substring(0, 100),
    author: comment.author?.name
  });
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'sentry-webhook',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint - intentionally throw error
router.get('/test-error', (req, res) => {
  console.log('🧪 Testing Sentry integration...');
  throw new Error('This is a test error for Sentry integration');
});

// Test with different error types
router.get('/test-error/:type', (req, res) => {
  const { type } = req.params;
  
  switch (type) {
    case 'reference':
      throw new ReferenceError('Test ReferenceError');
      
    case 'type':
      throw new TypeError('Test TypeError');
      
    case 'syntax':
      // Syntax errors can't be thrown, simulate instead
      throw new Error('SyntaxError simulation');
      
    case 'async':
      setTimeout(() => {
        throw new Error('Async test error');
      }, 100);
      res.json({ message: 'Async error thrown in background' });
      break;
      
    default:
      throw new Error(`Test error: ${type}`);
  }
});

module.exports = router;
