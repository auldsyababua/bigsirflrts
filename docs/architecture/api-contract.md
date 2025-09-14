# FLRTS-OpenProject API Contract Specification

## Overview
This document defines the API contract between FLRTS NLP Service and OpenProject REST API v3. **CRITICAL**: FLRTS never writes directly to the database. All operations MUST go through the OpenProject REST API.

## Authentication

### OpenProject API Key Authentication
```http
Authorization: Basic <base64(apikey:api_key_value)>
Content-Type: application/json
```

## Core Operations

### 1. CREATE Work Package

**Endpoint**: `POST /api/v3/work_packages`

**FLRTS Request Flow**:
1. Parse natural language with OpenAI
2. Convert timezone to assignee's local time
3. Map entities to OpenProject IDs
4. Call OpenProject API

**Request Body**:
```json
{
  "subject": "Server logs review",
  "description": {
    "format": "markdown",
    "raw": "Review and analyze server logs for anomalies",
    "html": "<p>Review and analyze server logs for anomalies</p>"
  },
  "_links": {
    "type": {
      "href": "/api/v3/types/2"  // Task type
    },
    "project": {
      "href": "/api/v3/projects/site-a"
    },
    "assignee": {
      "href": "/api/v3/users/taylor"
    },
    "responsible": {
      "href": "/api/v3/users/colin"
    },
    "status": {
      "href": "/api/v3/statuses/1"  // New/Open
    },
    "priority": {
      "href": "/api/v3/priorities/8"  // Normal
    }
  },
  "dueDate": "2025-01-15",
  "customField1": "Site A Equipment"
}
```

**Response**: `201 Created`
```json
{
  "id": 1234,
  "subject": "Server logs review",
  "lockVersion": 1,
  "_embedded": {
    "assignee": {
      "id": "taylor",
      "name": "Taylor"
    }
  },
  "_links": {
    "self": {
      "href": "/api/v3/work_packages/1234"
    }
  }
}
```

### 2. READ Work Packages

#### List Work Packages with Filters
**Endpoint**: `GET /api/v3/work_packages`

**Query Parameters**:
```
filters=[
  {"assignee":{"operator":"=","values":["taylor"]}},
  {"status":{"operator":"!","values":["closed","archived"]}},
  {"dueDate":{"operator":"<>d","values":["2025-01-10","2025-01-20"]}}
]
&pageSize=100
&offset=0
&sortBy=[["dueDate","asc"]]
```

**Response**: `200 OK`
```json
{
  "_embedded": {
    "elements": [
      {
        "id": 1234,
        "subject": "Server logs review",
        "dueDate": "2025-01-15"
      }
    ]
  },
  "total": 45,
  "pageSize": 100,
  "offset": 0
}
```

#### Get Single Work Package
**Endpoint**: `GET /api/v3/work_packages/:id`

**Response**: Complete work package resource with all properties and embedded resources.

### 3. UPDATE Work Package

**Endpoint**: `PATCH /api/v3/work_packages/:id`

**Request Body** (partial update):
```json
{
  "lockVersion": 1,
  "subject": "Updated: Server logs review - URGENT",
  "dueDate": "2025-01-14",
  "_links": {
    "assignee": {
      "href": "/api/v3/users/bryan"
    },
    "status": {
      "href": "/api/v3/statuses/7"  // In Progress
    }
  }
}
```

**Response**: `200 OK` with updated work package

### 4. ARCHIVE Work Package (Soft Delete)

**CRITICAL**: Never use DELETE endpoint. Always use status change for audit trail.

**Endpoint**: `PATCH /api/v3/work_packages/:id`

**Request Body**:
```json
{
  "lockVersion": 2,
  "_links": {
    "status": {
      "href": "/api/v3/statuses/14"  // Archived/Closed
    }
  }
}
```

## Supporting Endpoints

### Get Available Projects
```http
GET /api/v3/projects
```

### Get Available Types
```http
GET /api/v3/types
```

### Get Available Statuses
```http
GET /api/v3/statuses
```

### Get Users
```http
GET /api/v3/users
```

### Get Work Package Form (for validation)
```http
POST /api/v3/projects/:id/work_packages/form
```

## Error Handling

### Common Error Responses

**400 Bad Request** - Invalid request format
```json
{
  "errorIdentifier": "urn:openproject-org:api:v3:errors:InvalidRequestBody",
  "message": "The request body is invalid"
}
```

**403 Forbidden** - Insufficient permissions
```json
{
  "errorIdentifier": "urn:openproject-org:api:v3:errors:MissingPermission",
  "message": "You are not authorized to access this resource"
}
```

**422 Unprocessable Entity** - Validation errors
```json
{
  "_embedded": {
    "errors": [
      {
        "errorIdentifier": "urn:openproject-org:api:v3:errors:PropertyConstraintViolation",
        "message": "Subject can't be blank"
      }
    ]
  }
}
```

## FLRTS Integration Pattern

```typescript
// Example TypeScript integration
interface FLRTSToOpenProjectMapper {
  // Map parsed NLP to OpenProject API format
  async mapToWorkPackage(parsedData: ParsedNLPData): Promise<OpenProjectWorkPackage> {
    // 1. Convert timezone
    const convertedDueDate = this.convertToAssigneeTimezone(
      parsedData.due_at,
      parsedData.assignee_timezone
    );
    
    // 2. Map entities to IDs
    const projectId = await this.getProjectId(parsedData.location);
    const assigneeId = await this.getUserId(parsedData.assignee);
    
    // 3. Build OpenProject payload
    return {
      subject: parsedData.task_description,
      dueDate: convertedDueDate,
      _links: {
        project: { href: `/api/v3/projects/${projectId}` },
        assignee: { href: `/api/v3/users/${assigneeId}` },
        type: { href: '/api/v3/types/2' },
        status: { href: '/api/v3/statuses/1' }
      }
    };
  }
}
```

## Rate Limiting & Best Practices

1. **Batch Operations**: When possible, use collection endpoints with filters
2. **Caching**: Cache project, user, and type mappings (refresh every 5 minutes)
3. **Lock Version**: Always include lockVersion for updates to prevent conflicts
4. **Error Recovery**: On 422 errors, display to user for manual correction
5. **Pagination**: Use pageSize=100 for list operations
6. **Connection Pool**: Reuse HTTP connections, don't create new ones per request

## Webhook Integration (Optional)

For receiving notifications from OpenProject:

```json
{
  "webhook": {
    "url": "https://your-domain.com/webhooks/openproject",
    "events": ["work_package:created", "work_package:updated"],
    "secret": "your-webhook-secret"
  }
}
```