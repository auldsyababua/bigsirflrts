/**
 * Linear Integration Module for BigSirFLRTS
 * Provides direct access to Linear as Single Source of Truth
 */

import { LinearClient } from '@linear/sdk';

class LinearIntegration {
  constructor(apiKey = process.env.LINEAR_API_KEY) {
    if (!apiKey) {
      throw new Error('LINEAR_API_KEY environment variable is required');
    }
    this.client = new LinearClient({ apiKey });
    this.projectId = '9d089be4-a284-4879-9b67-f472abecf998'; // BigSirFLRTS
    this.teamId = 'YOUR_LINEAR_PROJECT_ID'; // 10netzero
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    return await this.client.viewer;
  }

  /**
   * Get BigSirFLRTS project details
   */
  async getProject() {
    return await this.client.project(this.projectId);
  }

  /**
   * Get all issues for BigSirFLRTS project
   */
  async getProjectIssues(options = {}) {
    const project = await this.getProject();
    const issues = await project.issues({
      first: options.limit || 50,
      filter: {
        state: options.state,
        assignee: options.assignee,
        labels: options.labels
      }
    });
    return issues.nodes;
  }

  /**
   * Create a new issue in BigSirFLRTS
   */
  async createIssue(data) {
    return await this.client.createIssue({
      teamId: this.teamId,
      projectId: this.projectId,
      title: data.title,
      description: data.description,
      priority: data.priority || 0,
      stateId: data.stateId,
      assigneeId: data.assigneeId,
      labelIds: data.labelIds,
      estimate: data.estimate
    });
  }

  /**
   * Update an existing issue
   */
  async updateIssue(issueId, updates) {
    return await this.client.updateIssue(issueId, updates);
  }

  /**
   * Get issue by ID or identifier
   */
  async getIssue(issueIdOrIdentifier) {
    // Check if it's an identifier like "10N-86"
    if (issueIdOrIdentifier.includes('-')) {
      // Use the issueSearch method for identifiers
      const results = await this.client.searchIssues(issueIdOrIdentifier);
      const issue = results.nodes.find(i => i.identifier === issueIdOrIdentifier);
      if (issue) return issue;

      // Fallback to listing with filter
      const issues = await this.client.issues({
        filter: {
          team: { id: { eq: this.teamId } }
        }
      });
      return issues.nodes.find(i => i.identifier === issueIdOrIdentifier);
    }
    // Otherwise treat as UUID
    return await this.client.issue(issueIdOrIdentifier);
  }

  /**
   * Add comment to an issue
   */
  async addComment(issueId, body) {
    return await this.client.createComment({
      issueId,
      body
    });
  }

  /**
   * Get current cycle for the team
   */
  async getCurrentCycle() {
    const team = await this.client.team(this.teamId);
    const cycles = await team.cycles({
      filter: {
        isPast: { eq: false },
        isFuture: { eq: false }
      }
    });
    return cycles.nodes[0];
  }

  /**
   * Get workflow states for the team
   */
  async getWorkflowStates() {
    const team = await this.client.team(this.teamId);
    const states = await team.states();
    return states.nodes;
  }

  /**
   * Search issues by text
   */
  async searchIssues(query) {
    return await this.client.searchIssues(query, {
      teamId: this.teamId,
      projectId: this.projectId
    });
  }

  /**
   * Get project roadmap (milestones)
   */
  async getProjectRoadmap() {
    const project = await this.getProject();
    const milestones = await project.projectMilestones();
    return milestones.nodes;
  }

  /**
   * Sync issue status from git branch
   */
  async syncFromGitBranch(branchName) {
    // Extract issue identifier from branch name
    // Format: colin/10n-86-some-description
    const match = branchName.match(/([A-Z0-9]+-\d+)/i);
    if (!match) return null;

    const identifier = match[1].toUpperCase();
    const issue = await this.getIssue(identifier);

    if (issue) {
      // Update issue to "In Progress" if in backlog
      const states = await this.getWorkflowStates();
      const inProgressState = states.find(s => s.name === 'In Progress');

      if (issue.state.name === 'Backlog' && inProgressState) {
        await this.updateIssue(issue.id, {
          stateId: inProgressState.id
        });
      }
    }

    return issue;
  }

  /**
   * Generate BMAD context from Linear issue
   */
  async generateBMADContext(issueId) {
    const issue = await this.getIssue(issueId);
    const project = await this.getProject();

    // Handle fields that may or may not be functions
    const getField = async (obj, field) => {
      if (!obj) return null;
      const value = obj[field];
      if (typeof value === 'function') {
        return await value.call(obj);
      }
      return value;
    };

    return {
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        priority: issue.priority,
        estimate: issue.estimate,
        labels: await getField(issue, 'labels') || [],
        assignee: await getField(issue, 'assignee'),
        state: await getField(issue, 'state'),
        gitBranchName: issue.branchName
      },
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        url: project.url
      },
      context: {
        parentIssues: await getField(issue, 'parent'),
        subIssues: await getField(issue, 'children') || [],
        comments: await getField(issue, 'comments') || { nodes: [] },
        attachments: await getField(issue, 'attachments') || []
      }
    };
  }
}

// Singleton instance
let linearInstance = null;

export function getLinearClient() {
  if (!linearInstance) {
    linearInstance = new LinearIntegration();
  }
  return linearInstance;
}

export default LinearIntegration;