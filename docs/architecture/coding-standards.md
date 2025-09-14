# FLRTS Coding Standards

## General Principles

1. **Clarity over Cleverness**: Write code that is easy to understand
2. **Consistency**: Follow established patterns within the codebase
3. **Type Safety**: Leverage TypeScript's type system fully
4. **Testability**: Write code that is easy to test
5. **Documentation**: Document the "why", not the "what"

## TypeScript Standards

### Type Definitions

```typescript
// ✅ GOOD: Explicit types with clear naming
interface CreateTaskRequest {
  input: string;
  userId: string;
  timezone: TimezoneString;
}

// ❌ BAD: Any types or unclear names
interface Data {
  stuff: any;
  user: any;
}
```

### Enum vs Union Types

```typescript
// ✅ GOOD: Use union types for string literals
type Operation = 'CREATE' | 'UPDATE' | 'DELETE' | 'LIST';

// ⚠️ AVOID: Enums unless needed for numeric values
enum OperationEnum {
  CREATE = 0,
  UPDATE = 1
}
```

### Null Handling

```typescript
// ✅ GOOD: Use optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Anonymous';

// ❌ BAD: Nested if checks
const userName = user && user.profile && user.profile.name 
  ? user.profile.name 
  : 'Anonymous';
```

## Code Organization

### File Structure

```typescript
// ✅ GOOD: Logical grouping with clear separation
// parsing.service.ts

// 1. Imports (grouped and ordered)
import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

import { ParsedTaskSchema } from '@flrts/shared/schemas';
import { Logger } from '@/utils/logger';

// 2. Types/Interfaces
interface ParsingOptions {
  useCache: boolean;
  timeout: number;
}

// 3. Constants
const DEFAULT_TIMEOUT = 5000;

// 4. Main class/function
export class ParsingService {
  // Implementation
}

// 5. Helper functions (if needed)
function sanitizeInput(input: string): string {
  // Implementation
}
```

### Function Design

```typescript
// ✅ GOOD: Single responsibility, clear parameters
async function convertTimezone(
  date: Date,
  fromZone: string,
  toZone: string
): Promise<Date> {
  // Single, focused implementation
}

// ❌ BAD: Multiple responsibilities, unclear parameters
async function processStuff(data: any, flag: boolean) {
  if (flag) {
    // Do one thing
  } else {
    // Do something completely different
  }
}
```

## Async/Await Patterns

### Error Handling

```typescript
// ✅ GOOD: Explicit error handling with typed errors
try {
  const result = await parseTask(input);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof OpenAIError) {
    logger.error('OpenAI parsing failed', { error, input });
    return { success: false, error: 'PARSE_FAILED' };
  }
  throw error; // Re-throw unexpected errors
}

// ❌ BAD: Swallowing errors or generic catches
try {
  return await parseTask(input);
} catch (e) {
  console.log(e);
  return null;
}
```

### Promise Patterns

```typescript
// ✅ GOOD: Parallel execution when possible
const [user, projects, tasks] = await Promise.all([
  fetchUser(userId),
  fetchProjects(userId),
  fetchTasks(userId)
]);

// ❌ BAD: Sequential when parallel would work
const user = await fetchUser(userId);
const projects = await fetchProjects(userId);
const tasks = await fetchTasks(userId);
```

## API Design

### RESTful Endpoints

```typescript
// ✅ GOOD: Clear, RESTful routes
router.post('/api/v1/tasks', createTask);
router.get('/api/v1/tasks/:id', getTask);
router.put('/api/v1/tasks/:id', updateTask);
router.delete('/api/v1/tasks/:id', deleteTask);

// ❌ BAD: Non-standard or ambiguous routes
router.post('/api/makeTask', createTask);
router.get('/api/getTaskData', getTask);
```

### Response Format

```typescript
// ✅ GOOD: Consistent response structure
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}

// ❌ BAD: Inconsistent responses
// Sometimes: { result: data }
// Sometimes: { data: data }
// Sometimes: just data
```

## Testing Standards

### Test Organization

```typescript
// ✅ GOOD: Clear test structure with proper setup
describe('ParsingService', () => {
  let service: ParsingService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    service = new ParsingService(mockOpenAI);
  });
  
  describe('parseInput', () => {
    it('should parse simple task creation', async () => {
      // Arrange
      const input = 'Create task for @Taylor';
      const expected = { operation: 'CREATE', assignee: 'taylor' };
      
      // Act
      const result = await service.parseInput(input);
      
      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

### Test Naming

```typescript
// ✅ GOOD: Descriptive test names
it('should convert PST to EST correctly for afternoon times', async () => {});
it('should throw ValidationError when input exceeds 1000 characters', () => {});

// ❌ BAD: Vague test names
it('should work', () => {});
it('test timezone', () => {});
```

## React/Next.js Standards

### Component Structure

```tsx
// ✅ GOOD: Functional component with proper typing
interface CommandBarProps {
  onSubmit: (input: string) => Promise<void>;
  placeholder?: string;
}

export function CommandBar({ onSubmit, placeholder = 'Type a command...' }: CommandBarProps) {
  const [input, setInput] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(input);
    setInput('');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
    </form>
  );
}
```

### Hooks Usage

```typescript
// ✅ GOOD: Custom hooks for logic extraction
function useParser() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const parse = useCallback(async (input: string) => {
    setParsing(true);
    setError(null);
    try {
      const result = await api.parse(input);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setParsing(false);
    }
  }, []);
  
  return { parse, parsing, error };
}
```

## Database Patterns

### Connection Management (Supabase)

```typescript
// ✅ GOOD: Use Supavisor pooling appropriately
// For serverless/edge functions - Transaction mode (port 6543)
const DATABASE_URL = 'postgres://user.project:[password]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true';

// For persistent servers - Session mode (port 5432)
const DATABASE_URL = 'postgres://user.project:[password]@aws-0-region.pooler.supabase.com:5432/postgres';

// ❌ BAD: Direct connection from serverless
const DATABASE_URL = 'postgresql://postgres:[password]@db.project.supabase.co:5432/postgres';
```

### Query Patterns

```typescript
// ✅ GOOD: Parameterized queries with proper escaping
const user = await db.query(
  'SELECT * FROM users WHERE id = $1 AND active = $2',
  [userId, true]
);

// ❌ BAD: String concatenation (SQL injection risk)
const user = await db.query(
  `SELECT * FROM users WHERE id = '${userId}'`
);
```

### Transaction Handling

```typescript
// ✅ GOOD: Proper transaction with rollback
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO tasks...', [taskData]);
  await client.query('UPDATE users...', [userId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Security Standards

### Input Validation

```typescript
// ✅ GOOD: Validate and sanitize all inputs
import { z } from 'zod';

const CreateTaskSchema = z.object({
  input: z.string().min(1).max(1000).trim(),
  userId: z.string().uuid(),
  timezone: z.enum(['PST', 'CST', 'EST'])
});

function createTask(req: Request) {
  const validated = CreateTaskSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ValidationError(validated.error);
  }
  // Process validated.data
}
```

### Secret Management

```typescript
// ✅ GOOD: Environment variables for secrets
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  throw new Error('OPENAI_API_KEY not configured');
}

// ❌ BAD: Hardcoded secrets
const openaiKey = 'sk-1234567890abcdef';
```

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Test additions
- `chore`: Maintenance

### Examples

```bash
# ✅ GOOD
feat(nlp): add timezone conversion for task parsing
fix(api): handle OpenProject rate limiting correctly
docs(architecture): update deployment instructions

# ❌ BAD
update stuff
fix
wip
```

## Performance Guidelines

### Optimization Principles

1. **Measure First**: Profile before optimizing
2. **Cache Wisely**: Cache expensive operations
3. **Batch Operations**: Group database/API calls
4. **Lazy Loading**: Load data only when needed
5. **Pagination**: Always paginate large datasets

### Example Optimizations

```typescript
// ✅ GOOD: Efficient caching
class ParsingCache {
  private cache = new Map<string, CachedResult>();
  
  async get(key: string): Promise<ParsedTask | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.data;
    }
    return null;
  }
}

// ✅ GOOD: Batch processing
async function createMultipleTasks(tasks: TaskInput[]) {
  // Single API call instead of N calls
  return openProjectClient.bulkCreate(tasks);
}
```

## Documentation Standards

### Code Comments

```typescript
// ✅ GOOD: Explain why, not what
// Convert to assignee's timezone because OpenProject displays
// times in the viewer's timezone, not the assignee's
const localTime = convertToAssigneeTimezone(dueDate, assignee);

// ❌ BAD: Obvious comments
// Set user to null
user = null;
```

### JSDoc for Public APIs

```typescript
/**
 * Parses natural language input into a structured task.
 * 
 * @param input - Natural language task description
 * @param context - User context including timezone and preferences
 * @returns Parsed task structure ready for OpenProject
 * @throws {ParseError} When input cannot be understood
 * @example
 * const task = await parse('Create task for @Taylor due tomorrow');
 */
export async function parse(
  input: string,
  context: UserContext
): Promise<ParsedTask> {
  // Implementation
}
```

## Review Checklist

Before submitting PR, ensure:

- [ ] Code follows TypeScript standards
- [ ] All functions have proper error handling
- [ ] Complex logic has unit tests
- [ ] API changes are documented
- [ ] No console.log statements in production code
- [ ] Secrets are in environment variables
- [ ] Database queries are parameterized
- [ ] Components are properly typed
- [ ] Commits follow conventional format
- [ ] Performance impact considered