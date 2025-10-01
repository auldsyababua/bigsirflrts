# ERPNext vs Traditional SQL Comparison

**Status:** Not Started **Phase:** 1.1 **Agent:** Perplexity/WebSearch **Date
Created:** 2025-09-30

## Purpose

Mental model guide for developers familiar with PostgreSQL/traditional RDBMS to
understand ERPNext's approach.

## Comparison Table

| PostgreSQL Concept | ERPNext Equivalent | Key Differences  | Notes          |
| ------------------ | ------------------ | ---------------- | -------------- |
| Table              | DocType            | <!-- Fill in --> | <!-- Notes --> |
| Column             | Field              | <!-- Fill in --> | <!-- Notes --> |
| Foreign Key        | Link Field         | <!-- Fill in --> | <!-- Notes --> |
| Check Constraint   | Validation         | <!-- Fill in --> | <!-- Notes --> |
| View               | Report             | <!-- Fill in --> | <!-- Notes --> |
| Trigger            | Hook               | <!-- Fill in --> | <!-- Notes --> |
| Row Level Security | Permission Rules   | <!-- Fill in --> | <!-- Notes --> |
| Schema             | Module             | <!-- Fill in --> | <!-- Notes --> |

<!-- Agent: Expand table with findings -->

## Migration Mental Models

### Creating a New Entity

**PostgreSQL Way:**

```sql
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ERPNext Way:**

```json
{
  "doctype": "Work Order",
  "fields": [
    {"fieldname": "title", "fieldtype": "Data", "reqd": 1},
    {"fieldname": "status", "fieldtype": "Select"},
    ...
  ]
}
```

**Key Differences:**

<!-- Agent: Explain the philosophical differences -->

### Relationships

**PostgreSQL Way:**

```sql
ALTER TABLE work_orders
  ADD CONSTRAINT fk_location
  FOREIGN KEY (location_id) REFERENCES locations(id);
```

**ERPNext Way:**

```json
{
  "fieldname": "location",
  "fieldtype": "Link",
  "options": "Location"
}
```

**Key Differences:**

<!-- Agent: Explain relationship handling -->

## Common Gotchas

<!-- Agent: Document common mistakes when transitioning from SQL to ERPNext -->

1. **Gotcha 1:** <!-- Description -->
2. **Gotcha 2:** <!-- Description -->

## Best Practices

<!-- Agent: Document best practices for working with ERPNext schema -->

## References

<!-- Agent: List comparison guides, migration docs, tutorials -->
