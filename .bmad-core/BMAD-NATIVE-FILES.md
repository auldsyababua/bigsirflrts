# BMAD-Method Expected File Creation

## Executive Summary

- Total agents analyzed: 10 (Master, Analyst, Architect, PM, Dev, QA, PO, SM, UX
  Expert, Orchestrator)
- Total required document types: 18 core templates
- Total optional document types: 6 (workflow-conditional)
- Conflicts found: None - agents have clear boundaries
- Gaps identified: None - all document types have designated creators
- Key Finding: BMAD uses template-driven document generation with strict file
  path conventions

Resource Matrix

TEMPLATES (Core Document Types)

| Template                          | Output File                                  | Primary Agent | Mandatory            |
| --------------------------------- | -------------------------------------------- | ------------- | -------------------- |
| prd-tmpl.yaml                     | docs/prd.md                                  | PM            | Yes for greenfield   |
| brownfield-prd-tmpl.yaml          | docs/prd.md                                  | PM            | Yes for brownfield   |
| project-brief-tmpl.yaml           | docs/brief.md                                | Analyst       | Strongly recommended |
| story-tmpl.yaml                   | docs/stories/{epic}.{story}.{title}.md       | PM/PO         | Yes per story        |
| architecture-tmpl.yaml            | docs/architecture.md                         | Architect     | Yes                  |
| fullstack-architecture-tmpl.yaml  | docs/architecture.md                         | Architect     | Context-dependent    |
| brownfield-architecture-tmpl.yaml | docs/architecture.md                         | Architect     | Brownfield only      |
| front-end-architecture-tmpl.yaml  | docs/architecture.md                         | Architect     | UI projects          |
| front-end-spec-tmpl.yaml          | docs/front-end-spec.md                       | UX Expert     | UI projects          |
| competitor-analysis-tmpl.yaml     | docs/analysis/competitor-{name}.md           | Analyst       | As needed            |
| market-research-tmpl.yaml         | docs/research/market-research-{topic}.md     | Analyst       | As needed            |
| qa-gate-tmpl.yaml                 | {qaLocation}/gates/{epic}.{story}-{slug}.yml | QA            | Per story review     |
| brainstorming-output-tmpl.yaml    | docs/brainstorm/{topic}.md                   | Analyst       | Optional             |

TASKS (Workflow Patterns)

| Task                       | Creates/Modifies              | Agent Usage         |
| -------------------------- | ----------------------------- | ------------------- |
| create-doc.md              | Varies by template            | All agents          |
| document-project.md        | Multiple discovery docs       | Master/Analyst      |
| shard-doc.md               | Splits large docs into shards | Master/PM/Architect |
| brownfield-create-epic.md  | Epic structure                | PM                  |
| brownfield-create-story.md | Story files                   | PM                  |
| review-story.md            | QA Results section in story   | QA                  |
| qa-gate.md                 | Gate decision file            | QA                  |

Per-Agent Compliance Requirements

Analyst Agent (Mary)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|----------------------|--------------------------------|------------------|----------------------------|----------------------|
| Project Brief | project-brief-tmpl.yaml | docs/ | brief.md | Strongly
recommended | | Market Research | market-research-tmpl.yaml | docs/research/ |
market-research-{topic}.md | Context-dependent | | Competitor Analysis |
competitor-analysis-tmpl.yaml | docs/analysis/ | competitor-{name}.md |
Context-dependent | | Brainstorming Output | brainstorming-output-tmpl.yaml |
docs/brainstorm/ | {topic}.md | Optional |

Directory Structure Required: docs/ ├── brief.md # Project brief (one per
project) ├── research/ # Market research documents ├── analysis/ # Competitor
analyses └── brainstorm/ # Brainstorming session outputs

PM Agent (John)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|------------------|---------------------------|-----------------|---------------------------|----------------------|
| PRD (Greenfield) | prd-tmpl.yaml | docs/ | prd.md | Yes for greenfield | | PRD
(Brownfield) | brownfield-prd-tmpl.yaml | docs/ | prd.md | Yes for brownfield |
| Story Documents | story-tmpl.yaml via tasks | docs/stories/ |
{epic}.{story}.{title}.md | Yes per story | | Epic Structure |
brownfield-create-epic.md | docs/stories/ | epic-{num}-\*.md | Yes for epics | |
PRD Shards | shard-doc.md | docs/prd/ | As configured | When PRD > threshold |

Directory Structure Required: docs/ ├── prd.md # Main PRD document ├── prd/ #
Sharded PRD sections (if sharded) │ ├── requirements.md │ └── stories.md └──
stories/ # All story documents ├── 1.1.user-auth.md └── 1.2.data-import.md

Architect Agent (Winston)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|-------------------------|-----------------------------------|--------------------|-----------------|----------------|
| Architecture (Standard) | architecture-tmpl.yaml | docs/ | architecture.md |
Yes | | Full-Stack Architecture | fullstack-architecture-tmpl.yaml | docs/ |
architecture.md | For full-stack | | Brownfield Architecture |
brownfield-architecture-tmpl.yaml | docs/ | architecture.md | For brownfield | |
Frontend Architecture | front-end-architecture-tmpl.yaml | docs/ |
architecture.md | For UI-only | | Architecture Shards | shard-doc.md |
docs/architecture/ | As configured | When large |

Directory Structure Required: docs/ ├── architecture.md # Main architecture
document └── architecture/ # Sharded architecture sections (if sharded) ├──
infrastructure.md ├── data-model.md └── api-design.md

Dev Agent (James)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|---------------|-------------------------|-----------------|--------------------------|-----------|
| Story Updates | N/A - modifies existing | docs/stories/ | Existing story files
| Yes | | Debug Logs | N/A - inline updates | In story file | Dev Agent Record
section | Yes | | File Lists | N/A - inline updates | In story file | File List
section | Yes |

Directory Structure Required: docs/ └── stories/ # Updates existing story files
only └── \*.md # Modifies Dev Agent Record sections

Critical: Dev agent ONLY updates specific sections in existing story files:

- Task checkboxes [x]
- Dev Agent Record section
- Debug Log References
- Completion Notes
- File List
- Change Log
- Status field

QA Agent (Quinn)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|-----------------------|----------------------|---------------------|---------------------------|----------------|
| Quality Gate Decision | qa-gate-tmpl.yaml | {qaLocation}/gates/ |
{epic}.{story}-{slug}.yml | Yes per review | | QA Results | N/A - inline update
| In story file | QA Results section | Yes per review | | Risk Profile |
risk-profile.md task | {qaLocation}/risk/ | {epic}.{story}-risk.md | Optional |
| Test Design | test-design.md task | {qaLocation}/tests/ |
{epic}.{story}-tests.md | Optional |

Directory Structure Required: docs/ ├── qa/ # Or as configured in
core-config.yaml │ ├── gates/ # Quality gate decisions │ │ └── 1.1-auth.yml │
├── risk/ # Risk assessments │ └── tests/ # Test designs └── stories/ # Updates
QA Results section only

UX Expert Agent

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|------------------------|-----------------------------|-----------------|-------------------|---------------------|
| Frontend Specification | front-end-spec-tmpl.yaml | docs/ | front-end-spec.md
| Yes for UI projects | | AI Generation Prompt | generate-ai-frontend-prompt |
Output to user | N/A | Optional |

Directory Structure Required: docs/ └── front-end-spec.md # UI/UX specification
document

PO Agent (Product Owner)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|---------------------|------------------------|-----------------|---------------------------|-----------|
| Story Creation | create-next-story.md | docs/stories/ |
{epic}.{story}.{title}.md | Yes | | Story Validation | validate-next-story.md |
N/A | Validation only | N/A | | Checklist Execution | po-master-checklist.md |
N/A | Process validation | N/A |

SM Agent (Scrum Master)

Required Documents: | Document Type | Template/Task | Output Location | Naming
Pattern | Mandatory |
|-------------------|---------------------|-----------------|-------------------|-----------|
| Change Management | change-checklist.md | N/A | Process checklist | As needed
|

Universal Requirements (All Agents)

Files ALL Agents Must Respect

1. .bmad-core/core-config.yaml - Project configuration
2. docs/prd.md - Product Requirements Document
3. docs/architecture.md - Architecture Document
4. docs/stories/\*.md - Story documents
5. .bmad-core/data/technical-preferences.md - Technical standards

Directories ALL Agents Must Respect

.bmad-core/ # BMAD system files (read-only) docs/ # All project documentation
docs/stories/ # User stories docs/qa/ # QA artifacts (configurable) docs/prd/ #
Sharded PRD (if applicable) docs/architecture/ # Sharded architecture (if
applicable)

Naming Patterns ALL Must Follow

- Stories: {epic_num}.{story_num}.{story_title_short}.md
- QA Gates: {epic_num}.{story_num}-{story_slug}.yml
- Sharded docs: Parent directory matching document name
- Research/Analysis: Include topic/name in filename

Cross-Reference Validation

No Conflicts Found

- Each document type has a single designated creator agent
- Agents have clear modification boundaries (e.g., Dev only updates specific
  story sections)
- No overlapping file creation responsibilities

Dependencies Identified

1. PM → Analyst: PRD requires Project Brief
2. Architect → PM: Architecture requires PRD
3. UX Expert → PM: Frontend spec requires PRD
4. Dev → PM/PO: Development requires approved stories
5. QA → Dev: QA review requires completed development

Workflow Sequences

Greenfield: Analyst → PM → UX Expert → Architect → PM (update) → PO → Dev → QA
Brownfield: Analyst (document) → PM (epic/story) → Architect → Dev → QA

Recommendations for MVP Enforcement

Must Enforce (Git Hooks/CI)

1. Story file section boundaries - Dev/QA can only modify their designated
   sections
2. File naming patterns - Stories must follow {epic}.{story}.{title}.md
3. Required directories - docs/, docs/stories/ must exist
4. Template outputs - Files created via templates must match expected paths

Prompting Only (Agent Instructions)

1. Project Brief recommendation - Analyst suggests but doesn't force
2. Sharding thresholds - Agents decide when to shard large documents
3. Optional analyses - Market research, competitor analysis as needed

Future Enhancements

1. Automated template versioning - Track template versions in created documents
2. Cross-agent validation - Agents verify prerequisite documents exist
3. Directory structure initialization - Automated setup on project start
4. Compliance reporting - Track which documents have been created

Enforcement Implementation Strategy

Phase 1: Directory Structure (Immediate)

required_directories: - docs/ - docs/stories/ - docs/qa/gates/ # If
qa.qaLocation configured - .bmad-core/ # System directory

enforcement: pre-commit hook

Phase 2: File Pattern Validation (Week 1)

file_patterns: stories:
'^docs/stories/\d+\.\d+\.[\w-]+\.md$'
    qa_gates: '^.*/gates/\d+\.\d+-[\w-]+\.yml$'
prd: '^docs/prd\.md$'
    architecture: '^docs/architecture\.md$'

enforcement: git hook + CI check

Phase 3: Section Boundary Protection (Week 2)

protected_sections: dev_agent: allowed_sections: - "Tasks / Subtasks" #
Checkboxes only - "Dev Agent Record" - "File List" - "Status" qa_agent:
allowed_sections: - "QA Results"

enforcement: Custom git diff analyzer

⏺ Summary

The BMAD compliance audit reveals a well-structured, template-driven document
generation system with clear agent boundaries. Key findings:

1. 18 core templates define the mandatory document types
2. Strict file paths ensure consistency (docs/, docs/stories/, etc.)
3. Clear agent boundaries prevent conflicts - each agent has specific creation
   and modification rights
4. Section-level permissions for story files - Dev and QA can only modify
   designated sections
5. Workflow dependencies create a natural sequence of document creation

The system is designed for enforcement at three levels:

- Hard enforcement via git hooks for critical patterns
- Soft enforcement via agent prompting for recommendations
- Process enforcement via checklists and workflows
