/**
 * TradeMatch Vendor Dashboard - Messaging & Credits Backend API
 * 
 * Handles:
 * 1. Real-time messaging between vendors and customers
 * 2. Credit purchases via Stripe
 * 3. Credit balance management
 * 4. Message notifications
 */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());

// ==================== MESSAGING SYSTEM ====================

/**
 * Get conversations for a vendor
 * GET /api/messages/conversations/:vendorId
 */
app.get('/api/messages/conversations/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Fetch conversations from database
    // This is a simplified example - use your actual DB
    const conversations = await db.query(`
      SELECT 
        c.id,
        c.customer_id,
        cu.name as customer_name,
        cu.avatar,
        c.last_message,
        c.last_message_time,
        c.unread_count,
        c.job_title,
        c.job_location
      FROM conversations c
      JOIN customers cu ON c.customer_id = cu.id
      WHERE c.vendor_id = $1
      ORDER BY c.last_message_time DESC
    `, [vendorId]);
    
    res.json({
      conversations: conversations.rows,
      total: conversations.rowCount
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get messages for a conversation
 * GET /api/messages/conversation/:conversationId
 */
app.get('/api/messages/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await db.query(`
      SELECT 
        m.id,
        m.sender_id,
        m.sender_type,
        m.message,
        m.created_at,
        m.read_at
      FROM messages m
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);
    
    res.json({
      messages: messages.rows,
      total: messages.rowCount
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send a message
 * POST /api/messages/send
 */
app.post('/api/messages/send', async (req, res) => {
  try {
    const { vendorId, customerId, conversationId, message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Create or get conversation
    let conversation;
    if (conversationId) {
      conversation = { id: conversationId };
    } else {
      // Create new conversation
      const result = await db.query(`
        INSERT INTO conversations (id, vendor_id, customer_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
        RETURNING id
      `, [vendorId, customerId]);
      conversation = result.rows[0];
    }
    
    // Insert message
    const messageResult = await db.query(`
      INSERT INTO messages (
        id, conversation_id, sender_id, sender_type, message, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'vendor', $3, NOW()
      )
      RETURNING *
    `, [conversation.id, vendorId, message]);
    
    // Update conversation
    await db.query(`
      UPDATE conversations
      SET last_message = $1,
          last_message_time = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [message, conversation.id]);
    
    const newMessage = messageResult.rows[0];
    
    // Emit real-time message via Socket.IO
    io.to(`conversation_${conversation.id}`).emit('new_message', newMessage);
    
    // Send push notification to customer
    await sendPushNotification(customerId, {
      title: 'New message from vendor',
      body: message,
      conversationId: conversation.id
    });
    
    res.json({
      success: true,
      message: newMessage,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark messages as read
 * POST /api/messages/mark-read
 */
app.post('/api/messages/mark-read', async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    
    await db.query(`
      UPDATE messages
      SET read_at = NOW()
      WHERE conversation_id = $1
        AND sender_id != $2
        AND read_at IS NULL
    `, [conversationId, userId]);
    
    // Update unread count
    await db.query(`
      UPDATE conversations
      SET unread_count = 0
      WHERE id = $1
    `, [conversationId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get unread message count
 * GET /api/messages/unread/:vendorId
 */
app.get('/api/messages/unread/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const result = await db.query(`
      SELECT COALESCE(SUM(unread_count), 0) as total_unread
      FROM conversations
      WHERE vendor_id = $1
    `, [vendorId]);
    
    res.json({
      unread: parseInt(result.rows[0].total_unread)
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CREDITS SYSTEM ====================

/**
 * Get vendor credit balance
 * GET /api/credits/balance/:vendorId
 */
app.get('/api/credits/balance/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const result = await db.query(`
      SELECT credits_balance
      FROM vendors
      WHERE id = $1
    `, [vendorId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json({
      balance: result.rows[0].credits_balance
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Purchase credits - Create Stripe Checkout Session
 * POST /api/credits/purchase
 */
app.post('/api/credits/purchase', async (req, res) => {
  try {
    const { vendorId, credits, amount } = req.body;
    
    // Determine price ID based on credits amount
    let priceId;
    switch(credits) {
      case 50:
        priceId = process.env.STRIPE_PRICE_50_CREDITS;
        break;
      case 150:
        priceId = process.env.STRIPE_PRICE_150_CREDITS;
        break;
      case 300:
        priceId = process.env.STRIPE_PRICE_300_CREDITS;
        break;
      case 500:
        priceId = process.env.STRIPE_PRICE_500_CREDITS;
        break;
      default:
        return res.status(400).json({ error: 'Invalid credit package' });
    }
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/dashboard?credits_purchased=${credits}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
      metadata: {
        vendorId,
        credits,
        type: 'credit_purchase'
      }
    });
    
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating credit purchase session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deduct credits (when vendor accesses a lead)
 * POST /api/credits/deduct
 */
app.post('/api/credits/deduct', async (req, res) => {
  try {
    const { vendorId, credits, leadId, reason } = req.body;
    
    // Begin transaction
    await db.query('BEGIN');
    
    try {
      // Check current balance
      const balanceResult = await db.query(`
        SELECT credits_balance FROM vendors WHERE id = $1 FOR UPDATE
      `, [vendorId]);
      
      const currentBalance = balanceResult.rows[0].credits_balance;
      
      if (currentBalance < credits) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          error: 'Insufficient credits',
          required: credits,
          available: currentBalance
        });
      }
      
      // Deduct credits
      await db.query(`
        UPDATE vendors
        SET credits_balance = credits_balance - $1,
            updated_at = NOW()
        WHERE id = $2
      `, [credits, vendorId]);
      
      // Log transaction
      await db.query(`
        INSERT INTO credit_transactions (
          id, vendor_id, type, amount, balance_after, reference_type, reference_id, description, created_at
        ) VALUES (
          gen_random_uuid(), $1, 'debit', $2, $3, 'lead_access', $4, $5, NOW()
        )
      `, [vendorId, credits, currentBalance - credits, leadId, reason]);
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        newBalance: currentBalance - credits
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add credits (from purchase or admin)
 * POST /api/credits/add
 */
app.post('/api/credits/add', async (req, res) => {
  try {
    const { vendorId, credits, reason, referenceId } = req.body;
    
    await db.query('BEGIN');
    
    try {
      // Get current balance
      const balanceResult = await db.query(`
        SELECT credits_balance FROM vendors WHERE id = $1 FOR UPDATE
      `, [vendorId]);
      
      const currentBalance = balanceResult.rows[0].credits_balance;
      const newBalance = currentBalance + credits;
      
      // Add credits
      await db.query(`
        UPDATE vendors
        SET credits_balance = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newBalance, vendorId]);
      
      // Log transaction
      await db.query(`
        INSERT INTO credit_transactions (
          id, vendor_id, type, amount, balance_after, reference_type, reference_id, description, created_at
        ) VALUES (
          gen_random_uuid(), $1, 'credit', $2, $3, 'purchase', $4, $5, NOW()
        )
      `, [vendorId, credits, newBalance, referenceId, reason]);
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        newBalance
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get credit transaction history
 * GET /api/credits/history/:vendorId
 */
app.get('/api/credits/history/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await db.query(`
      SELECT 
        id,
        type,
        amount,
        balance_after,
        reference_type,
        reference_id,
        description,
        created_at
      FROM credit_transactions
      WHERE vendor_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [vendorId, limit, offset]);
    
    res.json({
      transactions: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== STRIPE WEBHOOKS ====================

/**
 * Handle Stripe webhooks
 * POST /api/webhooks/stripe
 */
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

async function handleCheckoutCompleted(session) {
  const { vendorId, credits } = session.metadata;
  
  if (session.metadata.type === 'credit_purchase' && session.payment_status === 'paid') {
    // Add credits to vendor account
    await fetch(`${process.env.API_URL}/api/credits/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorId,
        credits: parseInt(credits),
        reason: `Purchased ${credits} credits`,
        referenceId: session.id
      })
    });
    
    // Send confirmation email
    // await sendEmail(vendorId, 'Credits Added', `Your ${credits} credits have been added!`);
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
}

async function handlePaymentFailed(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  // Notify vendor
}

// ==================== SOCKET.IO REAL-TIME MESSAGING ====================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });
  
  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.id} left conversation ${conversationId}`);
  });
  
  // Typing indicator
  socket.on('typing', ({ conversationId, userName }) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', { userName });
  });
  
  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(`conversation_${conversationId}`).emit('user_stop_typing');
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ==================== HELPER FUNCTIONS ====================

async function sendPushNotification(userId, notification) {
  // Implement push notification logic
  // e.g., Firebase Cloud Messaging, OneSignal, etc.
  console.log(`Sending notification to ${userId}:`, notification);
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for real-time messaging`);
});

module.exports = { app, io };
