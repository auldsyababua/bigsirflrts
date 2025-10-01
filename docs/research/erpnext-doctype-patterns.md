# ERPNext DocType Design Patterns

**Status:** Not Started **Phase:** 1.3 **Agent:** Perplexity/WebSearch + GitHub
Search **Date Created:** 2025-09-30

## Research Questions

### 1. Master vs Transactional DocTypes

**Question:** What's the difference and when to use each?

**Findings:**

<!-- Agent: Document the differences -->

**Examples from ERPNext:**

- Master DocTypes: <!-- List examples -->
- Transactional DocTypes: <!-- List examples -->

### 2. Child Tables (Line Items)

**Question:** How do child tables work in ERPNext?

**Findings:**

<!-- Agent: Document child table patterns -->

**Example Use Case:**

```json
// Example of parent-child relationship
// Agent: Provide ERPNext example
```

### 3. Standard Field Patterns

**Question:** What standard fields appear in most DocTypes?

**Common Fields:**

- `name` - <!-- Explanation -->
- `owner` - <!-- Explanation -->
- `creation` - <!-- Explanation -->
- `modified` - <!-- Explanation -->
- `docstatus` - <!-- Explanation -->

**When to override:**

### 4. Naming Series

**Question:** How does ERPNext auto-generate names/IDs?

**Findings:**

**Examples:**

```
WO-{YYYY}-{#####}  -> WO-2025-00001
LOC-.######        -> LOC-000001
```

### 5. Link Fields

**Question:** How do relationships work?

**Findings:**

**Example:**

```json
{
  "fieldname": "location",
  "fieldtype": "Link",
  "options": "Location" // Points to Location DocType
}
```

### 6. Permission Patterns

**Question:** How are permissions typically structured?

**Findings:**

<!-- Agent: Document permission patterns -->

### 7. Validation Patterns

**Question:** Where does validation happen?

**Findings:**

**Options:**

1. Field-level validation
2. Document-level validation (hooks)
3. Server scripts

**Best practices:**

## Real-World Examples

### Example 1: Work Order DocType

**Source:** <!-- GitHub URL or ERPNext docs -->

**Key Patterns Used:**

- <!-- Pattern 1 -->
- <!-- Pattern 2 -->

**Code/JSON:**

```json
// Agent: Paste relevant portions
```

**Lessons Learned:**

### Example 2: Custom FSM Implementation

**Source:** <!-- GitHub URL -->

**Key Patterns Used:**

**Lessons Learned:**

### Example 3: Third-Party App Extension

**Source:** <!-- GitHub URL -->

**Key Patterns Used:**

**Lessons Learned:**

## Anti-Patterns (What NOT to Do)

<!-- Agent: Document common mistakes -->

1. **Anti-Pattern 1:**
   - What: <!-- Description -->
   - Why bad: <!-- Explanation -->
   - Instead do: <!-- Better approach -->

## Recommendations for FLRTS

<!-- Agent: Based on research, recommend patterns for FLRTS custom DocTypes -->

### For FLRTS Personnel DocType

**Recommended Pattern:** <!-- Master or Transactional? -->

**Reasoning:**

**Key Fields Pattern:**

### For FLRTS Work (if customizing Work Order)

**Recommended Pattern:**

**Reasoning:**

### For FLRTS Lists

**Recommended Pattern:**

**Reasoning:**

## GitHub Repositories Reviewed

<!-- Agent: List all repos examined -->

1. **Repo Name** - URL
   - What we learned:

2. **Repo Name** - URL
   - What we learned:

## References

<!-- Agent: List all documentation, tutorials, blog posts reviewed -->
