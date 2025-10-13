# Prompts

This directory contains structured prompt templates and their recommended evaluation tests for the BigSirFLRTS project.

## Files
- `planning-agent.prompt.yml`: The Planning Agent prompt template, including context schema, recommended tests, and sample inputs.

## Usage
- Use these templates to drive evaluation runs in CI or to configure execution agents.
- Keep templates small, well-documented, and versioned. Update the `version` field when making backward-incompatible changes.

## Conventions
- File naming: `<relevant-name>.prompt.yml`
- Include: `name`, `description`, `version`, `promptOrigin`, `model`, `temperature`, `template`, `contextSchema`, `tests`, and `sampleInputs`.
- Tests should focus on observable behavior and conformance to our standards.

## Next Steps
- Integrate these prompts with evaluation pipelines when ready (see CircleCI evaluation tools).

