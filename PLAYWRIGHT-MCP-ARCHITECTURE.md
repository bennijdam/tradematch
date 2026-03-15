# Playwright MCP Architecture for TradeMatch

This guide explains how the Playwright Model Context Protocol (MCP) server can be integrated into TradeMatch, allowing AI coding assistants (like Kimi 2.5, Claude Code, or Cursor) to directly interact with and test your front-end dashboards in real-time.

## 1. What is MCP & How It Works for TradeMatch

The **Model Context Protocol (MCP)** is an open standard that allows LLM agents to securely interact with local tools. Microsoft's Playwright MCP server wraps the powerful Playwright browser automation framework and exposes its commands as callable "tools".

Instead of you or the AI writing a massive `test.spec.js` file, running it, and reading the output, the AI can physically operate a browser step-by-step using these specific tools.

For TradeMatch, this is incredibly valuable because the platform has complex, authenticated, multi-role interfaces:
*   **Customer Dashboard** (posting jobs, viewing quotes)
*   **Vendor Dashboard** (viewing leads, buying credits, messaging)
*   **Super Admin Dashboard** (approving vendors, resolving disputes)

With Playwright MCP, the AI can log in as a Vendor, navigate to the Dashboard, click "Purchase Credits", and visually verify the Stripe checkout flow—all autonomously in real time.

---

## 2. The Setup: What Needs to Be Configured

To bridge your local TradeMatch instance with an AI assistant using the Playwright MCP, the following infrastructure piece needs to be active:

### The MCP Server
You need to run the open-source Playwright MCP server locally alongside your TradeMatch app. This server acts as the middleman between the LLM and the Chrome browser.

If you are using an MCP-compatible IDE (like Cursor or Claude Code), you configure it in their respective settings (e.g., `mcp.json` or cursor settings) to spawn the Playwright tool automatically:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

### The TradeMatch Local Server
For the AI to test TradeMatch, the local backend and frontend must be running (which they currently are, with the Backend API on `localhost:3001` and the Frontend on `localhost:8080`).

---

## 3. Example MCP Tool Calls

When the AI agent connects to the Playwright MCP, it is granted new abilities. Below is a simulated example of how the AI would test the **Vendor Lead Bidding Flow** directly.

### Step 1: Open the Frontend
**LLM calls tool:** `playwright_navigate`
```json
{
  "url": "http://localhost:8080/login.html"
}
```

### Step 2: Fill in the Vendor Credentials
**LLM calls tool:** `playwright_fill`
```json
{
  "selector": "input[name='email']",
  "value": "vendor@tradematch.uk"
}
```

### Step 3: Click the Login Button
**LLM calls tool:** `playwright_click`
```json
{
  "selector": "button[type='submit']"
}
```

### Step 4: Verify Dashboard Loaded
**LLM calls tool:** `playwright_evaluate`
```json
{
  "script": "document.querySelector('h1').innerText"
}
```
*Result: "Vendor Dashboard"*

### Step 5: Read the available Leads
**LLM calls tool:** `playwright_evaluate`
```json
{
  "script": "Array.from(document.querySelectorAll('.lead-card')).map(card => card.innerText)"
}
```
*Result: Automatically returns the text of all new leads directly back into the LLM context window.*

---

## 4. Understanding the Total Architecture

Here is how the pieces fit together:

1.  **AI Assistant (Kimi 2.5/Cursor)**: Thinks about the task (e.g., *"The user wants me to test if the Quote Engine works"*).
2.  **MCP Protocol**: The AI requests a browser action (e.g., *"Click the submit quote button"*).
3.  **Playwright MCP Server**: Receives the standardized JSON request and translates it into actual Playwright Node.js commands.
4.  **Local Browser Instances (Chromium/Webkit)**: Operates invisibly (headless) or visibly, performing the exact click on your TradeMatch Web frontend on `localhost:8080`.
5.  **TradeMatch Platform**: Reacts to the click naturally, firing HTTP requests to your Backend API on `localhost:3001`.
6.  **Response Loop**: The MCP server captures the resulting DOM changes or screenshots and feeds them directly back to the AI Assistant so it can decide its next move.

This creates a seamless loop where the AI can verify visual parity, debug live DOM states, and write End-to-End tests based on actual live interaction rather than guessing the CSS selectors.
