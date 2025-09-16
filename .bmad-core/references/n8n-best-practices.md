<!-- Powered by BMAD™ Core -->

# n8n Workflow Development Best Practices & Reference Guide

## CRITICAL: Read This Before Any n8n Implementation

This document contains essential knowledge for selecting, configuring, and implementing n8n workflows efficiently. All PM, QA, and Dev agents MUST reference this document when working with n8n.

## n8n-cloud Workflow Creation Protocol (CRITICAL)

### ⚠️ MANDATORY: Avoid "Could not find property option" Corruption

**PROBLEM**: Creating workflows with authentication references before creating credentials causes workflow corruption and empty canvas display.

**SOLUTION**: Follow this exact sequence to prevent corruption:

#### Step 1: Create Workflow WITHOUT Authentication
```javascript
// ✅ CORRECT: Start with authentication: "none"
{
  "parameters": {
    "authentication": "none",  // Always start with this
    "httpMethod": "POST",
    "path": "your-webhook-path"
  }
}
```

#### Step 2: Test Basic Workflow Function
```javascript
// ✅ Create minimal test to verify workflow creation
const testWorkflow = {
  "name": "Test Webhook (No Auth)",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "authentication": "none",
        "httpMethod": "POST",
        "path": "test-path"
      }
    }
  ]
};
```

#### Step 3: Manual Activation in UI
1. Open n8n-cloud dashboard
2. Navigate to workflow
3. Toggle "Active" switch
4. Verify webhook URLs are generated
5. Test with simple HTTP request

#### Step 4: Add Authentication (After Activation)
1. **Create credential FIRST** in n8n UI: Settings → Credentials
2. **Edit workflow** to reference existing credential
3. **Re-activate** workflow if needed

### 🚫 NEVER DO THIS:
```javascript
// ❌ WRONG: Referencing non-existent credentials
{
  "parameters": {
    "authentication": "headerAuth",  // Credential doesn't exist yet!
    "credentials": {
      "httpHeaderAuth": {
        "id": "non-existent-credential"  // Causes corruption
      }
    }
  }
}
```

### ✅ ALWAYS DO THIS:
```javascript
// ✅ CORRECT: Start simple, add auth later
{
  "parameters": {
    "authentication": "none",  // Safe starting point
    "httpMethod": "POST",
    "path": "webhook-path"
  }
}
// Add authentication manually in UI after activation
```

### Recovery from Corrupted Workflows

**If workflow shows empty canvas with "Could not find property option":**

1. **Delete corrupted workflow** immediately
2. **Recreate without authentication** using MCP tools
3. **Activate manually** in n8n UI
4. **Add credentials** through UI interface only

### MCP Tool Limitations for n8n-cloud

**What MCP Tools CAN Do:**
- ✅ Create workflows with basic configurations
- ✅ Update node parameters (if no credential references)
- ✅ Validate workflow structure
- ✅ List and search available nodes

**What MCP Tools CANNOT Do:**
- ❌ Create credentials
- ❌ Activate workflows reliably
- ❌ Reference credentials in workflow creation
- ❌ Fix corrupted workflows with credential references

**Workflow Process:**
```
MCP Tools (Structure) → Manual UI (Activation + Credentials) → MCP Tools (Updates)
```

### Real-World Example: Supabase Webhook Integration

**Based on actual resolution of workflow corruption (Sept 15, 2025):**

#### Problem Encountered:
- Created workflow with `authentication: "headerAuth"`
- Referenced non-existent credential ID
- Workflow showed empty canvas with "Could not find property option"
- Multiple workflows affected simultaneously

#### Successful Resolution Steps:

1. **Immediate Cleanup:**
```javascript
// Delete corrupted workflow
mcp__n8n-cloud__n8n_delete_workflow({id: "corrupted-workflow-id"});
```

2. **Recreate with MINIMAL Configuration (VERIFIED WORKING):**
```javascript
// ✅ MINIMAL configuration that prevents corruption - TESTED SEPT 16, 2025
const minimalWorkflow = {
  "name": "Minimal Supabase Webhook Test",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "supabase-tasks"
        // NO other parameters - this is key to preventing corruption
      }
    }
  ],
  "connections": {}
};

// Result: Workflow ID Co44uIFfs4owhAqL activated successfully
// Production URL: https://n8n-rrrs.sliplane.app/webhook/supabase-tasks
// Test URL: https://n8n-rrrs.sliplane.app/webhook-test/supabase-tasks
```

3. **Previous Failed Approach (DO NOT USE):**
```javascript
// ❌ This configuration caused corruption even with authentication: "none"
const corruptedWorkflow = {
  "name": "Supabase Tasks Webhook Integration (No Auth)",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "supabase-tasks",
        "authentication": "none",  // Even this caused issues
        "respond": "responseNode",  // These extra params trigger corruption
        "responseContentType": "application/json",
        "options": {"rawBody": true}
      }
    },
    {
      "type": "n8n-nodes-base.code",
      "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": "// Validation logic here"
      }
    },
    {
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": {"message": "Success"},
        "options": {"responseCode": 200}
      }
    }
  ],
  "connections": {
    "Webhook Node": {"main": [["Validation Node"]]},
    "Validation Node": {"main": [["Response Node"]]}
  }
};
```

3. **Verification:**
```javascript
// Verify workflow creation success
mcp__n8n-cloud__n8n_get_workflow({id: "new-workflow-id"});
// Should return active: false, but with proper structure
```

4. **Manual Activation (Required):**
- Open n8n-cloud dashboard
- Navigate to new workflow
- Toggle "Active" switch
- Verify webhook URLs appear

#### Key Success Factors:
- ✅ Started with `authentication: "none"`
- ✅ Used proper node name connections (not IDs)
- ✅ Included all required parameters upfront
- ✅ Activated manually before adding credentials

4. **Manual Activation (Required):**
- Open n8n-cloud dashboard
- Navigate to new workflow
- Toggle "Active" switch
- Verify webhook URLs appear

#### Key Success Factors:
- ✅ Use MINIMAL parameters only (`httpMethod` and `path`)
- ✅ NO authentication, respond, options, or other parameters initially
- ✅ Activate manually before adding any complexity
- ✅ Add validation/response nodes through UI after activation

#### Generated URLs (VERIFIED WORKING):
```
Production: https://n8n-rrrs.sliplane.app/webhook/supabase-tasks
Test: https://n8n-rrrs.sliplane.app/webhook-test/supabase-tasks
```

### Checklist for Corruption Prevention

**Before Creating Any n8n Workflow:**
- [ ] Start with `authentication: "none"`
- [ ] Use descriptive workflow names for identification
- [ ] Include all required node parameters
- [ ] Use node names (not IDs) in connections
- [ ] Test creation with MCP tools first
- [ ] Plan manual activation step
- [ ] Document webhook URLs after activation

**After Workflow Creation:**
- [ ] Verify workflow appears in dashboard
- [ ] Activate manually in UI
- [ ] Test webhook URLs with simple request
- [ ] Create credentials through UI if needed
- [ ] Update authentication settings last

**If Corruption Occurs:**
- [ ] Delete corrupted workflow immediately
- [ ] Check other workflows for similar issues
- [ ] Recreate using safe configuration pattern
- [ ] Document the corrupted configuration to avoid repeating

## Node Selection Strategy

### MANDATORY: Research ALL Possible Nodes Before Choosing

**Never accept the first working solution. Always evaluate alternatives.**

#### 1. Node Comparison Framework

For any given task, research and compare:

1. **Native n8n Nodes vs External Service Nodes**
   - Native nodes (e.g., `n8n-nodes-base.code`) are more reliable
   - External service nodes may have better features but add dependencies
   - Example: `n8n-nodes-base.httpRequest` vs specific API nodes

2. **Performance Considerations**
   ```
   FASTEST → SLOWEST:
   - Code node (JavaScript execution)
   - Native data transformation nodes
   - Database query nodes
   - HTTP Request nodes
   - External API nodes with authentication
   - AI/ML nodes (highest latency)
   ```

3. **Maintenance Impact**
   - Fewer nodes = easier to maintain
   - Combined operations in Code nodes vs multiple single-purpose nodes
   - Consider future modifications and debugging

#### 2. Common Node Selection Mistakes

❌ **WRONG**: Using OpenAI node for simple text processing
✅ **RIGHT**: Use Code node with regex or native string operations

❌ **WRONG**: Multiple IF nodes in sequence
✅ **RIGHT**: Single Switch node or Code node with conditional logic

❌ **WRONG**: Separate nodes for each data transformation
✅ **RIGHT**: Single Code node handling all transformations

## n8n-Specific Implementation Patterns

### 1. OpenAI Node Configuration

**CRITICAL**: OpenAI node uses `resource: "text"` NOT `resource: "chat"`

```json
// CORRECT OpenAI Configuration
{
  "resource": "text",
  "operation": "message",
  "model": "gpt-4o",
  "messages": {
    "messageValues": [
      {"role": "system", "message": "Your prompt"},
      {"role": "user", "message": "={{$json.field}}"}
    ]
  },
  "options": {
    "maxTokens": 800,
    "temperature": 0.2
  },
  "simplifyOutput": true,
  "jsonOutput": true  // Use when expecting JSON response
}
```

### 2. Error Handling Patterns

**Always implement error handling for critical nodes:**

```json
{
  "onError": "continueErrorOutput",  // For graceful degradation
  // OR
  "onError": "continueRegularOutput", // To ignore errors
  // OR
  "onError": "stopWorkflow"  // For critical failures
}
```

### 3. Data Flow Optimization

**Batch Processing vs Individual Items:**
- Use `splitInBatches` node for large datasets
- Configure batch sizes based on API rate limits
- Implement exponential backoff in Code nodes

### 4. Webhook Security

**MANDATORY for production webhooks:**

```javascript
// Input Validation Code Node (place after Webhook trigger)
const message = $input.all()[0].json.body.message || '';

// Length validation
if (message.length > 1000) {
  throw new Error('Message too long');
}

// Content filtering
const suspiciousPatterns = [
  /ignore.*previous.*instructions/i,
  /<script|javascript:/i,
  /\$\{.*\}/
];

for (const pattern of suspiciousPatterns) {
  if (pattern.test(message)) {
    throw new Error('Security filter triggered');
  }
}

return $input.all();
```

## Node Type Reference

### Data Processing Nodes (Preferred for Performance)

1. **Code Node** (`n8n-nodes-base.code`)
   - Use for: Complex logic, data transformation, validation
   - Pros: Fastest execution, full JavaScript capability
   - Cons: Requires coding knowledge

2. **Set Node** (`n8n-nodes-base.set`)
   - Use for: Simple field mapping
   - Better than: Multiple individual field nodes

3. **Function Node** (`n8n-nodes-base.function`)
   - Deprecated: Use Code node instead

### API Integration Nodes

1. **HTTP Request** (`n8n-nodes-base.httpRequest`)
   - Use for: Any API without dedicated node
   - Pros: Flexible, supports all HTTP methods
   - Configure: Always set timeout and retry logic

2. **GraphQL Node** (`n8n-nodes-base.graphql`)
   - Use for: GraphQL APIs only
   - Better than: HTTP Request for GraphQL

### Database Nodes

**Selection Priority:**
1. Native database nodes (PostgreSQL, MySQL, MongoDB)
2. Supabase node for Supabase projects
3. HTTP Request to database API
4. Generic SQL node (last resort)

### AI/ML Nodes

**Cost-Performance Matrix:**
```
Fastest & Cheapest:
- Code node with simple algorithms

Good Balance:
- OpenAI with gpt-3.5-turbo
- Anthropic Claude Haiku

Highest Quality (Expensive):
- OpenAI gpt-4o
- Anthropic Claude Opus
```

## Workflow Design Principles

### 1. Minimize Node Count
- Combine operations in Code nodes
- Use single Switch instead of multiple IFs
- Batch operations where possible

### 2. Optimize for Readability
- Clear node naming: "Validate User Input" not "Code1"
- Group related nodes visually
- Add sticky notes for complex logic

### 3. Plan for Failure
- Every external API call needs error handling
- Implement circuit breakers for critical services
- Log failures for debugging

### 4. Performance First
- Avoid unnecessary API calls
- Cache frequently used data
- Use webhooks instead of polling

## Common Implementation Patterns

### Pattern 1: Webhook → Validate → Process → Respond

```
[Webhook Trigger] → [Input Validation] → [Business Logic] → [Response]
                            ↓
                    [Error Response]
```

### Pattern 2: Batch Processing with Rate Limiting

```
[Trigger] → [Split In Batches] → [Process Items] → [Wait] → [Merge]
                     ↑________________________________↓
```

### Pattern 3: Resilient API Integration

```
[Prepare Request] → [HTTP Request] → [Validate Response] → [Process]
                          ↓                    ↓
                   [Retry Logic]        [Error Handler]
```

## Testing Strategies

### 1. Unit Testing Individual Nodes
- Test each node with sample data
- Verify error handling works
- Check edge cases

### 2. Integration Testing
- Test full workflow with real services
- Verify data flow between nodes
- Test error propagation

### 3. Load Testing
- Test with expected production volume
- Identify bottlenecks
- Optimize slow nodes

## Security Considerations

### 1. Credential Management
- Never hardcode credentials
- Use n8n credential store
- Rotate keys regularly

### 2. Input Validation
- ALWAYS validate webhook inputs
- Sanitize user data
- Implement rate limiting

### 3. Output Security
- Never expose internal IDs
- Sanitize error messages
- Implement proper access controls

## Performance Optimization Checklist

- [ ] Evaluated all possible nodes for each operation
- [ ] Minimized total node count
- [ ] Implemented error handling
- [ ] Added input validation
- [ ] Optimized data transformations
- [ ] Configured appropriate timeouts
- [ ] Implemented retry logic where needed
- [ ] Added logging for debugging
- [ ] Tested with production-like data volume
- [ ] Documented complex logic

## Quick Decision Matrix

| Task | Best Node Choice | Why |
|------|-----------------|-----|
| Simple data transformation | Code Node | Fastest execution |
| Multiple conditions | Switch Node | Cleaner than multiple IFs |
| API call with auth | Dedicated service node if available | Built-in auth handling |
| Generic API call | HTTP Request | Most flexible |
| Text analysis | Code Node with regex | Faster than AI |
| Complex text processing | OpenAI/Anthropic | When regex isn't enough |
| Database operations | Native DB node | Better error handling |
| File operations | Code Node | More control |
| Scheduling | Cron Trigger | Built for purpose |
| Webhook receipt | Webhook Trigger | Designed for this |

## Red Flags in Workflow Design

🚫 More than 20 nodes in a workflow - consider splitting
🚫 Multiple nested IF nodes - use Switch instead
🚫 No error handling on external calls
🚫 Hardcoded credentials or URLs
🚫 No input validation on webhooks
🚫 Using AI nodes for simple logic
🚫 Polling when webhooks are available
🚫 No documentation or sticky notes

## References and Resources

- n8n Official Docs: https://docs.n8n.io
- Node Reference: Use `mcp__n8n-cloud__get_node_info`
- Node Search: Use `mcp__n8n-cloud__search_nodes`
- Validation: Use `mcp__n8n-cloud__validate_node_minimal`

---

**REMEMBER**: The best n8n workflow is not the one that works, but the one that works efficiently, reliably, and maintainably. Always research thoroughly before implementing.