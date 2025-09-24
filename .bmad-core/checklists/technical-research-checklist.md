<!-- Powered by BMAD™ Core -->

# Technical Research Checklist

## Purpose

Ensure all technical implementation details in stories are properly researched,
documented with working examples, and validated before marking the story as
ready for development.

## When to Use

- MANDATORY: Before marking any story with technical components as "Ready"
- MANDATORY: When reviewing stories before development begins
- RECOMMENDED: During story refinement sessions

## Checklist Items

### 1. Technology Identification

- [ ] All technologies, APIs, frameworks, and services mentioned in the story
      are listed
- [ ] Each technology has been explicitly identified (name, version if relevant)
- [ ] No assumptions made about technology capabilities

### 2. Documentation Research

#### For APIs and Web Services:

- [ ] Used `mcp__ref__ref_search_documentation` to find official API docs
- [ ] Extracted exact endpoint URLs
- [ ] Documented HTTP methods (GET, POST, PUT, DELETE, etc.)
- [ ] Listed all required headers
- [ ] Identified authentication requirements
- [ ] Found rate limits and quotas
- [ ] Included working curl or SDK examples

#### For n8n Workflows:

- [ ] Used `mcp__n8n-cloud__search_nodes` to find correct node types
- [ ] Used `mcp__n8n-cloud__get_node_info` for complete parameter schemas
- [ ] Used `mcp__n8n-cloud__get_node_documentation` for working examples
- [ ] Used `mcp__n8n-cloud__validate_node_minimal` to verify configurations
- [ ] Documented exact node type names (case-sensitive)
- [ ] Included complete JSON configuration for each node
- [ ] Specified connection structure between nodes
- [ ] Listed required credentials and their types

#### For Database Operations:

- [ ] Schema definitions researched and documented
- [ ] Table structures with exact column names and types
- [ ] Relationships and foreign keys identified
- [ ] Indexes and constraints documented
- [ ] Migration requirements specified

#### For Frontend Components:

- [ ] Component library documentation referenced
- [ ] Props/parameters with types documented
- [ ] State management approach specified
- [ ] Event handlers and callbacks defined
- [ ] Styling approach and constraints noted

### 3. Code Examples

- [ ] Every technical component has at least one working code example
- [ ] Examples are copied VERBATIM from official documentation
- [ ] Examples include complete context (imports, setup, usage)
- [ ] Source URL provided for every example
- [ ] Examples are in the correct programming language for the project
- [ ] Developer can copy-paste examples and have them work

### 4. Configuration Validation

- [ ] All JSON/YAML configurations are valid (no syntax errors)
- [ ] Required fields are present in all configurations
- [ ] Optional fields are explicitly marked as optional
- [ ] Default values are documented where applicable
- [ ] Environment-specific configurations are noted

### 5. Error Handling Research

- [ ] Common error codes/messages documented
- [ ] Error handling patterns from documentation included
- [ ] Retry strategies specified where applicable
- [ ] Fallback approaches documented

### 6. Performance Considerations

- [ ] Rate limits documented with specific numbers
- [ ] Timeout values specified
- [ ] Batch size limitations noted
- [ ] Caching strategies researched if applicable
- [ ] Resource consumption estimates provided

### 7. Security Requirements

- [ ] Authentication methods fully documented
- [ ] API key/token management approach specified
- [ ] Data encryption requirements noted
- [ ] CORS considerations documented for web APIs
- [ ] Input validation requirements specified

### 8. Testing Requirements

- [ ] Test data examples provided for each component
- [ ] Mock/stub strategies documented for external services
- [ ] Test environment configuration specified
- [ ] Edge cases identified from documentation

### 9. Documentation Quality

- [ ] All technical details have source citations
- [ ] Links to documentation are current and working
- [ ] Version numbers specified where relevant
- [ ] Deprecation warnings noted if found
- [ ] Alternative approaches documented if multiple options exist

### 10. Common Pitfalls Avoided

- [ ] No pseudo-code masquerading as real code
- [ ] No "approximately correct" configurations
- [ ] No assumptions about parameter names or structures
- [ ] No outdated syntax from training data
- [ ] No mixing of different API versions
- [ ] No incorrect node type names (for n8n)
- [ ] No wrong resource/operation combinations (for n8n)

## Validation Questions

Before marking the checklist complete, answer:

1. **Can a developer implement this story using ONLY the provided
   documentation?**
2. **Are all code examples directly copy-pasteable?**
3. **Have all configurations been validated with appropriate tools?**
4. **Is every technical claim backed by a documentation source?**
5. **Would this story pass code review for technical accuracy?**

## Red Flags - Story NOT Ready If:

- ❌ Any configuration is "best guess" or "should be something like"
- ❌ Code examples are written from memory without verification
- ❌ API endpoints or parameters are assumed rather than researched
- ❌ n8n node configurations haven't been validated
- ❌ Source citations are missing for technical details
- ❌ Developer would need to research basic implementation details

## Success Criteria

The story is technically ready when:

- ✅ All checklist items are complete
- ✅ All validation questions answered "Yes"
- ✅ No red flags present
- ✅ Developer can begin implementation immediately without additional research
- ✅ Technical details are accurate enough to pass code review

## Notes

- This checklist is MANDATORY for stories with technical implementation
- If unable to find documentation for a component, explicitly document this gap
- When in doubt, over-research rather than under-research
- Time spent on research saves multiples of that time during development
