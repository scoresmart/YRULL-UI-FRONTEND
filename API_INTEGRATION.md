# Backend API Integration Guide

This guide explains how to connect your WhatsApp backend API to the FlowDesk frontend.

## 🔧 Configuration

### 1. Set Your Backend URL

In your `.env` file, set your Railway (or other) backend URL:

```env
VITE_API_BASE_URL=https://your-app.up.railway.app
# OR for local development:
# VITE_API_BASE_URL=http://localhost:3000
```

### 2. Restart Dev Server

After updating `.env`, restart:

```bash
npm run dev
```

## 📡 Required API Endpoints

Your backend must implement these endpoints:

### 1. Send WhatsApp Message

**POST** `/api/whatsapp/send`

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "conversation_id": "uuid-of-conversation",
  "contact_id": "uuid-of-contact",
  "phone": "+1234567890",
  "message": "Hello, this is a test message",
  "message_type": "text",
  "media_url": null
}
```

**Response (Success):**
```json
{
  "success": true,
  "message_id": "uuid-of-message",
  "sent_at": "2024-01-15T10:30:00Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Failed to send message: [error details]"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (invalid phone, missing fields)
- `401` - Unauthorized (invalid token)
- `500` - Server error

---

### 2. Get Conversations (Optional)

**GET** `/api/whatsapp/conversations`

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "contact_id": "uuid",
    "last_message": "Preview of last message",
    "unread_count": 2,
    "last_message_at": "2024-01-15T10:30:00Z"
  }
]
```

**Note:** If you don't implement this, the app will use Supabase directly for conversations.

---

### 3. Get Messages for Conversation (Optional)

**GET** `/api/whatsapp/messages/:conversationId`

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "direction": "outbound",
    "content": "Message text",
    "message_type": "text",
    "sent_at": "2024-01-15T10:30:00Z",
    "is_read": true
  }
]
```

**Note:** If you don't implement this, the app will use Supabase directly for messages.

---

### 4. Mark Message as Read (Optional)

**POST** `/api/whatsapp/messages/:messageId/read`

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "success": true
}
```

---

### 5. Get WhatsApp Connection Status

**GET** `/api/whatsapp/status`

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "connected": true,
  "phone_number": "+1234567890",
  "last_connected": "2024-01-15T10:00:00Z"
}
```

---

## 🔄 Webhook for Receiving Messages

Your backend should receive incoming WhatsApp messages via webhook and store them in Supabase.

### Recommended Flow:

1. **Receive webhook from WhatsApp** (e.g., Twilio, WhatsApp Business API, etc.)
2. **Store message in Supabase:**
   ```sql
   INSERT INTO public.messages (
     conversation_id,
     direction,
     content,
     message_type,
     sent_at
   ) VALUES (...);
   ```
3. **Update conversation:**
   ```sql
   UPDATE public.conversations 
   SET 
     last_message_at = NOW(),
     unread_count = unread_count + 1
   WHERE id = conversation_id;
   ```

The frontend will automatically see new messages via Supabase Realtime subscriptions (already configured).

---

## 🔐 Authentication

The frontend automatically includes the Supabase JWT token in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

Your backend should:
1. Verify the JWT token with Supabase
2. Extract user ID from the token
3. Ensure the user has permission to access the conversation/contact

---

## 📱 Phone Number Format

The frontend sends phone numbers in **E.164 format** (e.g., `+1234567890`).

If your WhatsApp API expects a different format, transform it in your backend.

---

## 🧪 Testing

### Test Sending a Message:

1. Open the app and go to `/whatsapp`
2. Select a conversation
3. Type a message and click Send
4. Check your backend logs to see the request
5. Verify the message appears in WhatsApp

### Test Receiving Messages:

1. Send a message to your WhatsApp number from an external phone
2. Your backend webhook should receive it
3. Backend stores it in Supabase
4. Frontend automatically shows it (via Realtime)

---

## 🐛 Troubleshooting

### "Failed to send message" error

- Check backend URL in `.env` is correct
- Verify backend is running and accessible
- Check browser console for detailed error
- Verify JWT token is being sent (check Network tab)

### Messages not appearing

- Check Supabase `messages` table has the new message
- Verify Realtime is enabled in Supabase
- Check browser console for Realtime connection errors

### CORS errors

Your backend must allow requests from your frontend domain:

```javascript
// Example Express.js CORS config
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],
  credentials: true
}));
```

---

## 📚 Example Backend Implementation (Node.js/Express)

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for backend
);

// Verify Supabase JWT
async function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ message: 'Invalid token' });
  
  req.user = user;
  next();
}

// Send WhatsApp message
app.post('/api/whatsapp/send', verifyAuth, async (req, res) => {
  const { conversation_id, contact_id, phone, message, message_type } = req.body;
  
  try {
    // Send via your WhatsApp API (Twilio, WhatsApp Business API, etc.)
    const result = await sendWhatsAppMessage(phone, message);
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        direction: 'outbound',
        content: message,
        message_type: message_type || 'text',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update conversation
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation_id);
    
    res.json({ success: true, message_id: data.id, sent_at: data.sent_at });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook to receive messages
app.post('/api/whatsapp/webhook', async (req, res) => {
  // Process incoming WhatsApp message
  const { from, body, mediaUrl } = req.body;
  
  // Find or create conversation
  // Store message in Supabase
  // Frontend will see it via Realtime
  
  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Backend running on port 3000'));
```

---

## ✅ Checklist

- [ ] Backend URL set in `.env`
- [ ] `/api/whatsapp/send` endpoint implemented
- [ ] JWT authentication working
- [ ] Messages stored in Supabase after sending
- [ ] Webhook configured to receive incoming messages
- [ ] Webhook stores messages in Supabase
- [ ] CORS configured for frontend domain
- [ ] Test sending a message works
- [ ] Test receiving a message works

---

## 🚀 Next Steps

1. Implement the `/api/whatsapp/send` endpoint
2. Configure your WhatsApp webhook to call your backend
3. Store incoming messages in Supabase
4. Test end-to-end message flow
5. Add support for media messages (images, files, audio)
