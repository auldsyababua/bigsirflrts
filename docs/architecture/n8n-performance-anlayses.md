
n8n Performance Analysis and Architectural Guidance for the FLRTS Platform


Executive Summary

This report provides a comprehensive performance analysis of the n8n workflow automation platform to guide its integration into the FLRTS task management system. The central finding is that n8n is an exceptionally powerful tool for orchestrating complex, asynchronous, and scheduled business logic. However, it introduces a non-trivial performance overhead, with a baseline latency of at least 20-50ms for any operation, which renders it unsuitable for real-time, user-facing interactions requiring sub-200ms responses.
The primary recommendation is the adoption of a hybrid architecture. In this model, n8n serves as the robust "brain" for core business process automation, while latency-sensitive operations, such as initial Telegram bot responses, are handled by lightweight, direct API handlers like Supabase Edge Functions. This approach leverages n8n's strengths in maintainability and low-code development for complex tasks while ensuring a responsive user experience.
Key technical takeaways from this analysis include:
The primary scaling bottleneck for a self-hosted n8n instance is its underlying database, typically PostgreSQL.1
Running n8n in queue mode is mandatory for any production environment to achieve concurrency and stability.2
The value of n8n is measured in accelerated development and improved maintainability for multi-step workflows, not in raw execution speed.4
In direct response to the priority questions for the FLRTS project:
Telegram Bot User Experience: n8n is too slow for immediate, interactive bot responses. A direct webhook handler should be used to acknowledge user messages instantly, which can then trigger an n8n workflow asynchronously for processing.
OpenAI API Calls: For simple API calls where the result is returned directly to a user, bypassing n8n is recommended. For multi-step workflows that enrich data before or after the OpenAI call, n8n is the ideal choice.
OpenProject CRUD Operations: n8n is perfectly suitable for these operations. They are typical backend business processes not constrained by stringent low-latency requirements, and the benefits of n8n's managed environment are significant.

Section 1: n8n Core Performance Characteristics

Understanding n8n's performance requires deconstructing its fundamental components. This section establishes a baseline of the overhead, bottlenecks, and resource consumption patterns inherent to the platform.

1.1. Latency Overhead Analysis: The "Scaffolding" Cost

Every operation routed through n8n pays a "scaffolding" cost—the time required for the platform to instantiate, execute, and log a workflow, independent of the business logic itself.
Baseline Latency: Even the most minimal workflow, consisting of a Webhook Trigger node immediately followed by a response, incurs a baseline latency of 20-50ms.1 This represents the fixed cost of entry for any synchronous operation processed by n8n. For latency-sensitive applications, this overhead is a critical architectural consideration, as it can consume a significant portion of the total response time budget before any actual work begins.
Node Execution Overhead: Each node in a workflow adds to the total execution time. While simple, built-in nodes like Set or If add only a few milliseconds, the cumulative effect in a complex workflow with ten or more nodes can be substantial.5 The total latency is a direct function of this baseline cost plus the sum of each node's execution time and the network latency of any external API calls.
Trigger Type Impact:
Webhooks: These are subject to the 20-50ms base latency plus network time. Performance is critically dependent on the response mode. Responding immediately decouples the caller from the workflow's execution time, whereas waiting for the final node's output makes the entire workflow's duration part of the synchronous response time.6
Cron/Scheduled: The performance of scheduled triggers is measured in throughput and reliability rather than latency. The scheduling mechanism itself has a negligible impact on the execution time of the workflow logic it initiates.7
Manual (UI-based): Executions triggered from the n8n editor are significantly slower, particularly with large datasets. This is because all execution data must be serialized and transmitted to the browser for rendering. This mode is designed exclusively for development and debugging and should never be used for performance benchmarking.8

1.2. Concurrency, Throughput, and Scaling Limits

n8n's ability to handle multiple workflows simultaneously is not automatic; it depends entirely on its configuration and underlying architecture.
Single Instance Throughput: Under ideal laboratory conditions with a trivial workflow, a single, well-resourced n8n instance can theoretically process up to 220 executions per second.10 However, real-world throughput will be considerably lower and is dictated by workflow complexity, payload size, and external service response times.
Concurrency Model (main vs. queue mode):
main mode (default): This mode runs all n8n processes—the UI, webhook listeners, and workflow executions—within a single Node.js event loop. It is fundamentally unsuitable for production, as a single long-running or CPU-intensive execution can block the entire instance, preventing it from responding to new webhooks or even UI requests.12
queue mode: This is the only viable mode for production. It decouples the main process (which handles webhooks and the UI) from the execution processes (workers). When a webhook arrives, the main instance places a job in a message queue (e.g., Redis) and can respond immediately. Separate, dedicated worker processes then consume jobs from this queue and execute the workflows. This architecture is essential for achieving true concurrency and scalability.2
Concurrency Limits: Concurrency in queue mode is explicitly managed. The environment variable N8N_CONCURRENCY (or the older N8N_CONCURRENCY_PRODUCTION_LIMIT) sets a hard cap on the number of active executions a single worker process can handle simultaneously. The default value is often a conservative 10, which can become an unexpected performance bottleneck if not adjusted. If this limit is reached, new jobs will wait in the queue until an execution slot becomes free.12

1.3. Resource Footprint: CPU and Memory Consumption Patterns

n8n's resource usage is highly dynamic and primarily driven by the volume and size of the data being processed within its workflows.
Memory per Execution: There is no fixed memory footprint for a workflow. Usage is directly proportional to the size of the data payload passed between nodes. Even moderately large datasets of around 12,000 items can cause significant memory pressure on the backend and introduce severe lag in the editor UI if run manually.9
The Memory Bloat Problem: A critical performance anti-pattern in n8n is the use of long-running, self-looping workflows. n8n's execution model retains the full input and output data for every node that has run within a single execution. Consequently, a workflow that loops 1,000 times will accumulate the data from all 1,000 iterations in memory. This leads to an exponential increase in memory consumption, causing dramatic slowdowns and eventual crashes.15 The correct architectural pattern is to break loops into a series of distinct, individual workflow executions.
CPU Usage: n8n is typically more memory-bound and I/O-bound than CPU-bound. High CPU usage is generally confined to workflows performing intensive data transformations within a Code node. If a workflow is slow but CPU usage remains low, the bottleneck is almost certainly an external factor, such as a slow API response or, most commonly, contention on the database.17

1.4. The Central Bottleneck: Database Performance under Load

The most critical factor limiting n8n's scalability is the performance of its database. For production, PostgreSQL is the recommended choice.
The Root Cause of Scaling Issues: n8n relies heavily on its database for normal operation. For every workflow execution, it performs multiple reads and writes to log the status, start/end times, and the full data payload for each node.1 As the number of concurrent executions increases, so does the load on the database.
Diminishing Returns on Scaling: This database dependency explains the counterintuitive phenomenon where adding more n8n worker instances can lead to a plateau or even a decrease in overall throughput. If the database cannot handle the increased volume of concurrent read/write operations from the additional workers, it becomes the central point of contention, and the entire system slows down.1 Scaling n8n effectively is, in practice, a database scaling problem.
Configuration is Key: The database connection pool size is a crucial tuning parameter. The default value for DB_POSTGRESDB_POOL_SIZE is 2, which is often too low for high-concurrency environments. Increasing this value to 4 or higher can yield significant performance improvements. For very large-scale deployments, using an external connection pooler like PgBouncer may be necessary.1

Section 2: Operational Suitability: A GO/NO-GO Framework

Based on the core performance characteristics, this section provides a clear decision-making framework for determining which operations are well-suited for n8n and which should bypass it for performance reasons.

2.1. Optimal Use Cases for n8n (The "GO" List)

n8n excels in scenarios where maintainability and complex orchestration outweigh the need for minimal latency.
Asynchronous Processing & API Orchestration: n8n is ideal for tasks triggered by a webhook where an immediate response can be sent to the caller while the main workload is processed in the background. This is a perfect fit for complex orchestrations involving multiple API calls, conditional logic, and robust error handling with retries.2
Scheduled/Cron Operations: For non-time-sensitive tasks such as nightly data synchronization, generating weekly reports, or sending scheduled reminders, n8n is an excellent choice. Its reliability and the visibility it provides into execution history are major advantages.7
Multi-Step Business Logic: This is n8n's core strength. Workflows that chain together multiple services—for instance, fetching a task from OpenProject, enriching its description with OpenAI, and updating a record in Supabase—are precisely what n8n is designed to simplify and manage.19
Data Transformation and Enrichment: n8n provides a powerful visual environment for medium-scale data manipulation, such as filtering records, reformatting dates, or merging data from different sources. This is particularly valuable when business logic needs to be understood and potentially modified by team members with limited coding expertise.22
Notification Dispatching: A common and low-impact use case is dispatching notifications to services like Telegram, Slack, or email as the final step of a workflow.24

2.2. Operations to Avoid in n8n (The "NO-GO" List)

For certain classes of operations, n8n's overhead and architectural model make it an unsuitable choice.
Real-time Synchronous Responses (<200ms): The inherent 20-50ms baseline latency makes it practically impossible to meet strict, low-latency requirements for user-facing interactions. For example, an interactive chatbot's initial reply would be noticeably delayed if it had to wait for an n8n workflow to execute synchronously.1
High-Frequency API Calls (>100 requests/minute): While a scaled n8n cluster can handle high throughput, using it for simple, high-frequency tasks like polling an API status endpoint every few seconds is highly inefficient. The overhead of instantiating a workflow and logging to the database for every single call makes a dedicated script or lightweight service a more performant and cost-effective solution.2
Large Data/File Processing (>10MB payloads): The default payload size limit in n8n is 16MB.26 Although this is configurable, processing large files or datasets directly in n8n's memory is inefficient and risks overwhelming the worker. The recommended pattern is to pass
references to large data (e.g., a URL to a file in Supabase Storage) through n8n, and offload the actual data processing to a more suitable service.
Complex Computational Tasks: n8n is an orchestrator, not a computational engine. CPU-intensive tasks such as image analysis, video transcoding, or complex financial modeling should be delegated to specialized services or libraries. The n8n Code node is designed for data transformation logic, not for heavy computation.27
Streaming/WebSocket Operations: n8n's execution model is fundamentally request-response. It is not designed to maintain the kind of persistent, long-lived connections required for handling WebSockets or streaming data.
Database Transactions (ACID Guarantees): An n8n workflow does not operate as a single atomic transaction. If a workflow that performs multiple database updates fails midway, there is no automatic rollback mechanism. Operations that require strict ACID (Atomicity, Consistency, Isolation, Durability) guarantees should be encapsulated within a single database transaction or stored procedure, which can be called by n8n as one atomic step.

Table 2.1: Operation Suitability Matrix for FLRTS

Operation
Typical Latency/Throughput
Key Performance Factor
n8n Suitability
Recommendation
Webhook Receivers (Telegram, etc.)
Latency-sensitive
Baseline overhead (20-50ms)
Conditional GO
Use for asynchronous triggers; avoid for synchronous responses.
Scheduled Batch Syncs
Throughput-sensitive
Database I/O, Worker Concurrency
GO
Ideal use case. Optimize with batching and queue mode.
Multi-step Error Handling
Reliability-sensitive
Native node features
GO
Core strength of n8n's visual workflow model.
Data Transformation
Throughput-sensitive
Node efficiency (Code vs. Set)
GO
Excellent for maintainability. Use Code node for performance.
Notification Dispatching
Reliability-sensitive
External API latency
GO
Low-impact, standard use case.
File Processing (>10MB)
Memory-sensitive
Payload size limits
NO-GO
Process file references in n8n, not the files themselves.
API Orchestration with Retries
Reliability-sensitive
Native node features
GO
Core strength of n8n.
Database CRUD via HTTP
Latency-tolerant
External API latency
GO
Perfect fit for backend business logic.
Real-time Chat Response
Latency-critical (<200ms)
Baseline overhead
NO-GO
The overhead makes meeting latency targets impossible.
High-Frequency Polling (>100/min)
Throughput-critical
Instantiation overhead
NO-GO
Inefficient due to per-execution overhead. Use a script.
ACID Transactions
Consistency-critical
Lack of transactionality
NO-GO
Encapsulate logic in a stored procedure and call it from n8n.


Section 3: Comparative Analysis: n8n vs. Direct Implementation for FLRTS

This section provides a direct, head-to-head comparison of implementing specific FLRTS operations using n8n versus a direct API approach, such as a Supabase Edge Function.

3.1. Methodology

The "Performance Delta" is estimated as the additional latency introduced by the n8n platform. This delta is a composite of several factors:
Baseline Overhead (20-50ms): The fixed cost to receive a request and start a workflow.
Node Execution Overhead: The processing time for each node in the chain.
Database Logging Overhead: The time taken to write execution status and data to the database, which becomes more significant under load.
The "Direct API Approach" is defined as a lightweight, serverless function (e.g., Supabase Edge Function, Vercel Function) or a dedicated microservice that interacts directly with service SDKs or REST APIs.

3.2. FLRTS Operations Performance Trade-Offs

The following table analyzes the performance trade-offs for the specific operations required by the FLRTS system.

Table 3.1: FLRTS Operations Performance Trade-Off Analysis


Operation
n8n Approach
Direct API Approach
Estimated Performance Delta
Recommendation & Justification
Telegram message receive
Webhook trigger → Process
Direct webhook handler
+50ms to +150ms
Use Direct API for initial response. Acknowledge the user's message in <100ms with an Edge Function, then trigger the n8n workflow asynchronously. This provides optimal UX by separating the user-facing response from the backend processing.
OpenAI NLP processing
HTTP Request node
Direct OpenAI SDK call
+10ms to +20ms
Depends on context. For a simple call-and-respond action, use the Direct API. If the OpenAI call is one step in a larger chain (e.g., Get data → Process with AI → Update record), the marginal overhead is negligible compared to the development benefit of keeping the logic in one place. Use n8n for chained logic.
OpenProject CRUD
HTTP Request node
Direct REST call
+10ms to +20ms
Use n8n. These are backend business operations where a 10-20ms latency difference is irrelevant. The low-code interface, built-in credential management, and execution visibility in n8n provide significant maintenance benefits that far outweigh the minor performance cost.
Timezone conversion
Code node
Native JS function
+5ms to +10ms
Use Code Node in n8n. A benchmark of the Code node versus the native Set node shows the Code node is highly efficient, running as raw JavaScript with minimal overhead.29 The performance is nearly identical to a native function, and it keeps the transformation logic within the workflow context.
Batch sync (100 items)
Loop / SplitInBatches nodes
Direct batch API call
+ seconds to minutes
Use n8n with caution. n8n's overhead is multiplied by each iteration. If the target API has a true bulk/batch endpoint, a direct script will be substantially faster. However, for reliability, per-item error handling, and respecting rate limits, n8n's SplitInBatches node is often a more robust and maintainable solution.30
Send notifications
Telegram node
Direct Bot API call
+10ms to +20ms
Use n8n. The benefits of a managed node (which handles API changes, authentication, and formatting) far outweigh the minuscule performance penalty. This is a clear case where maintainability trumps raw speed.


3.3. The Core Trade-Off: Maintenance Benefit vs. Performance Penalty

The analysis consistently reveals a central trade-off. The performance penalty of using n8n is real and prohibitive for real-time, synchronous use cases. A user waiting for a chatbot response will perceive the 50-150ms of added latency.
Conversely, the maintenance benefit is highest for complex, multi-step, asynchronous business logic. For these processes, n8n acts as "executable documentation." The visual workflow is easier to understand, debug, and modify for a wider team than a custom script would be.4
For the FLRTS platform, the strategic implication is clear: architect the system with a separation of concerns. Use fast, direct handlers as the "reflexes" for immediate user interaction, and use n8n as the "slow, powerful brain" for the complex business logic that happens behind the scenes.

Section 4: Production Optimization and Scaling Strategies

This section provides actionable guidance for configuring a self-hosted n8n instance to achieve maximum performance, stability, and cost-effectiveness in a production environment.

4.1. Workflow-Level Optimization

Efficiency begins with well-designed workflows.
Code Nodes vs. Built-in Nodes: For data transformations across a large number of items, a single Code node is significantly more performant than chaining multiple Set or other data manipulation nodes. The Code node executes as a single block of optimized JavaScript, whereas each expression in a Set node must be individually parsed and evaluated, incurring substantial overhead.29
Sub-workflows vs. Monolithic Workflows: Decompose large, complex workflows into smaller, reusable sub-workflows. This modular approach improves maintainability, simplifies testing, and can reduce memory pressure by creating isolated execution contexts for each part of the process.15
Parallel Execution & Batching: Use the SplitInBatches node to process large datasets. This node breaks a list of items into smaller chunks that can be processed concurrently, dramatically improving throughput. However, this must be balanced against the rate limits of external APIs and the resource capacity of the n8n workers.22
Early Data Filtering: Filter and reduce data as early as possible in a workflow. Removing unnecessary fields or items at the beginning of the process minimizes the amount of data that needs to be stored and passed between subsequent nodes, directly reducing memory consumption and improving performance.22

4.2. Infrastructure-Level Tuning

The underlying infrastructure configuration is critical for a scalable n8n deployment.
Queue Mode Configuration: As established, queue mode is essential. This requires setting EXECUTIONS_MODE=queue on the main n8n instance and using a Redis instance as the message broker. Worker instances are then launched separately using the n8n worker command to begin processing jobs from the queue.32
Worker Configuration: The number of workers and the concurrency per worker (--concurrency flag or N8N_CONCURRENCY variable) must be tuned to the workload. For I/O-bound workflows (those that spend most of their time waiting for API responses), a higher number of workers and higher concurrency per worker is effective. For CPU-bound workflows, concurrency should generally be aligned with the number of available CPU cores (e.g., one worker per core) to avoid thrashing.2
Database Optimization: The PostgreSQL database must be adequately resourced. Increasing the connection pool size via DB_POSTGRESDB_POOL_SIZE from the default of 2 to 4 or higher is a common and effective optimization.1 Regular database maintenance, such as vacuuming and index optimization, is also crucial.
Execution Data Pruning: Over time, the execution_entity table can grow to an enormous size, slowing down the entire system. It is critical to configure automatic pruning of old execution data. Set EXECUTIONS_DATA_PRUNE to true and define a reasonable retention period with EXECUTIONS_DATA_MAX_AGE (e.g., 30 days) to keep the database lean and performant.34

4.3. Webhook and Response Strategies

How webhooks are handled has a major impact on the perceived performance of the system.
Respond Immediately: For any webhook that triggers a process not required for the synchronous response, the webhook node should be configured to "Respond Immediately." This sends a 200 OK status code back to the caller instantly, while the workflow continues to execute asynchronously in the background. This is the single most important technique for decoupling n8n's processing time from the caller's experience.6
Webhook vs. Polling: Whenever possible, use event-driven webhooks instead of scheduled polling triggers. Webhooks create a more efficient architecture that only consumes resources when an event actually occurs, whereas polling consumes resources on a fixed schedule, leading to many unnecessary executions.35

Table 4.1: Key Performance-Related Environment Variables


Variable
Description
Default Value
Recommended Production Value
Source
EXECUTIONS_MODE
Sets the execution mode. queue is required for production scaling.
main
queue
32
N8N_CONCURRENCY
Caps the number of concurrent executions per worker process.
10
20-50 (I/O-bound) or # of CPU cores (CPU-bound)
12
DB_TYPE
Specifies the database type. PostgreSQL is strongly recommended.
sqlite
postgresdb
33
DB_POSTGRESDB_POOL_SIZE
Sets the number of connections in the database pool.
2
4 or higher, depending on concurrency
1
EXECUTIONS_DATA_PRUNE
Enables or disables automatic pruning of old execution data.
false
true
34
EXECUTIONS_DATA_MAX_AGE
Sets the maximum age (in hours) of execution data to keep.
720 (30 days)
720 (or as required by policy)
34
N8N_PAYLOAD_SIZE_MAX
Maximum payload size (in bytes) for partial executions in the editor.
16777216 (16MB)
67108864 (64MB) or higher, based on available RAM
26


4.4. A Practical Guide to Performance Monitoring and Load Testing

Proactive performance management is essential for a reliable system.
Monitoring: Implement a robust monitoring solution using tools like Prometheus and Grafana. Key metrics to track are the length of the Redis queue (a primary indicator of backlog), database connection statistics and query latency, CPU and memory utilization of worker containers, and the p95/p99 latency of workflow executions.22
Load Testing: Before deploying to production, and before releasing significant new workflows, conduct load testing to identify potential bottlenecks. The open-source tool k6 is excellent for simulating concurrent webhook traffic. Additionally, n8n provides its own benchmarking tool, @n8n/n8n-benchmark, which can be used to run standardized tests against an instance and measure its performance under various conditions.3

Section 5: Recommended Hybrid Architecture for FLRTS

This final section synthesizes the analysis into a concrete architectural blueprint and a clear decision-making framework for the FLRTS platform.

5.1. The Optimal Hybrid Model: "Reflex and Brain"

The recommended architecture is a hybrid model that separates immediate user-facing interactions from complex backend business logic. This can be conceptualized as a "Reflex and Brain" system.
Reflexes (Supabase Edge Functions): These are lightweight, fast, and stateless services that handle all initial, synchronous interactions from users. For FLRTS, when a message arrives from Telegram, it should hit an Edge Function first. The function's sole responsibilities are to perform basic validation, provide an immediate acknowledgment back to the user (e.g., "Processing your request..."), and then trigger the appropriate n8n workflow asynchronously via a webhook call. This ensures the user receives a response in under 100ms.
Brain (n8n in Queue Mode): This is the n8n instance, which handles all the complex, multi-step, asynchronous business logic. It receives triggers from the "Reflex" services and orchestrates the necessary API calls to OpenProject, OpenAI, and Supabase. Because it operates asynchronously, it is not constrained by the user's perceived latency and can take the time needed to execute complex logic, handle retries, and manage errors gracefully.

5.2. Architectural Flow Description

The data and control flow for a typical operation, like processing a Telegram message, would be as follows:
A user sends a message to the FLRTS Telegram bot.
Telegram sends a webhook notification to a publicly exposed Supabase Edge Function URL.
The Edge Function immediately sends a "Message received" response back to the user via the Telegram Bot API.
Simultaneously, the Edge Function makes an HTTP POST request to the n8n webhook trigger URL, passing along the message payload.
The n8n main instance receives the webhook, validates it, and places a job onto the Redis queue before returning a 200 OK to the Edge Function.
One of the available n8n worker instances picks up the job from Redis.
The worker executes the workflow logic, interacting with the PostgreSQL database to log its state and with external APIs (OpenProject, OpenAI) to perform the required actions.
Upon completion, the worker may send a final, detailed response or notification back to the user via the Telegram Bot API (e.g., "Your task has been created in OpenProject.").

5.3. Decision Framework and Latency Thresholds

To guide development, the FLRTS team should adopt the following rules:
Rule 1: The 500ms Threshold. If an operation is synchronous and requires a response to be delivered to an end-user in under 500ms, it MUST be handled by a "Reflex" service (e.g., an Edge Function) and must not wait for an n8n workflow to complete.
Rule 2: The Asynchronous Default. If an operation is asynchronous or does not have a strict latency requirement (i.e., a response time >1 second is acceptable), it SHOULD be implemented in n8n.
Rule 3: The Orchestration Imperative. If an operation involves coordinating logic across more than two external services or requires complex error handling and retries, it STRONGLY SHOULD be implemented in n8n to leverage its core workflow management capabilities.

5.4. Definitive Recommendations for FLRTS Priority Areas

Telegram Bot UX: The hybrid "Reflex and Brain" model is the definitive recommendation. This architecture will provide a fast, responsive user experience essential for conversational interfaces, while concentrating the complex, evolving business logic in the more maintainable low-code n8n environment.
OpenAI API Calls: These calls should be routed through n8n only when they are part of a larger automated process. For direct, interactive features like a Q&A bot, the API call should be made directly from a dedicated backend endpoint or Edge Function to minimize latency.
OpenProject API CRUD: These operations are a perfect fit for n8n. The marginal performance overhead is negligible for these backend processes. The significant benefits of managing core business operations in a visual, version-controlled, and easily auditable workflow platform make n8n the superior choice for this task.

Appendix: Resources & Further Reading

Official n8n Documentation:
Performance and Benchmarking: https://docs.n8n.io/hosting/scaling/performance-benchmarking/ 10
Configuring Queue Mode: https://docs.n8n.io/hosting/scaling/queue-mode/ 3
Concurrency Control: https://docs.n8n.io/hosting/scaling/concurrency-control/ 12
Benchmarking Tools:
n8n Benchmark Scripts on GitHub: https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/benchmark 3
k6 Load Testing: https://k6.io/ 3
Key Community Discussions:
Scaling n8n and API Response Time: https://community.n8n.io/t/scaling-n8n-while-maintaining-api-response-time-performance/35337 1
Memory Bloat and Long-Running Workflows: https://community.n8n.io/t/n8n-workflow-memory-bloat-processing-daily-sales-data-causes-exponential-slowdown-and-stalls/114385 15
Works cited
Scaling n8n while maintaining API response time performance - Questions, accessed September 13, 2025, https://community.n8n.io/t/scaling-n8n-while-maintaining-api-response-time-performance/35337
n8n Performance Optimization for High-Volume Workflows, accessed September 13, 2025, https://www.wednesday.is/writing-articles/n8n-performance-optimization-for-high-volume-workflows
We Maxed Out n8n - Here's When It Broke - YouTube, accessed September 13, 2025, https://www.youtube.com/watch?v=YvOCJzya9wU
n8n vs Make vs Zapier [2025 Comparison]: Which automation tool ..., accessed September 13, 2025, https://www.digidop.com/blog/n8n-vs-make-vs-zapier
Number of nodes = Latency : r/n8n - Reddit, accessed September 13, 2025, https://www.reddit.com/r/n8n/comments/1koleyl/number_of_nodes_latency/
Slow http-request node - Questions - n8n Community, accessed September 13, 2025, https://community.n8n.io/t/slow-http-request-node/10817
Cron integrations | Workflow automation with n8n, accessed September 13, 2025, https://n8n.io/integrations/cron/
Test n8n in execute step very slow is it normal? - Questions, accessed September 13, 2025, https://community.n8n.io/t/test-n8n-in-execute-step-very-slow-is-it-normal/181164
Performance Problem - Questions - n8n Community, accessed September 13, 2025, https://community.n8n.io/t/performance-problem/25712
Performance and benchmarking - n8n Docs, accessed September 13, 2025, https://docs.n8n.io/hosting/scaling/performance-benchmarking/
Workflows App Automation Features from n8n.io, accessed September 13, 2025, https://n8n.io/features/
Concurrency control | n8n Docs, accessed September 13, 2025, https://docs.n8n.io/hosting/scaling/concurrency-control/
Full available concurrency not being used - Questions - n8n Community, accessed September 13, 2025, https://community.n8n.io/t/full-available-concurrency-not-being-used/85020
Performance issue of the N8N workflow when need to operate more than 50 000 data, accessed September 13, 2025, https://community.n8n.io/t/performance-issue-of-the-n8n-workflow-when-need-to-operate-more-than-50-000-data/35356
N8n Workflow Memory Bloat: Processing Daily Sales Data Causes ..., accessed September 13, 2025, https://community.n8n.io/t/n8n-workflow-memory-bloat-processing-daily-sales-data-causes-exponential-slowdown-and-stalls/114385
High CPU usage and unresponsive dashboard after running long Loop workflow · Issue #12341 · n8n-io/n8n - GitHub, accessed September 13, 2025, https://github.com/n8n-io/n8n/issues/12341
Is it possible to assign more resource to N8N - Reddit, accessed September 13, 2025, https://www.reddit.com/r/n8n/comments/1hqev68/is_it_possible_to_assign_more_resource_to_n8n/
n8n / Cloudron Performance Discussion & Best Practice, accessed September 13, 2025, https://forum.cloudron.io/topic/14248/n8n-cloudron-performance-discussion-best-practice
CRM Workflow Automation Software & Tools - N8N, accessed September 13, 2025, https://n8n.io/supercharge-your-crm/
Scaling n8n for Business: Best Practices for Enterprise Workflow Automation, accessed September 13, 2025, https://www.oneclickitsolution.com/centerofexcellence/aiml/scaling-n8n-enterprise
ITOps Workflow Automation Software & Tools - n8n, accessed September 13, 2025, https://n8n.io/itops/
Optimizing Performance of Complex n8n Workflows in 2025 - Sandbox Technology, accessed September 13, 2025, https://sandboxtechnology.in/optimizing-performance-of-complex-n8n-workflows/
Elevate Your Business with n8n Workflow Optimization - Medium, accessed September 13, 2025, https://medium.com/@dejanmarkovic_53716/elevate-your-business-with-n8n-workflow-optimization-da8b6b28042c
How to integrate Telegram with n8n - Hostinger, accessed September 13, 2025, https://www.hostinger.com/tutorials/n8n-telegram-integration
Limit parallels http requests - Questions - n8n Community, accessed September 13, 2025, https://community.n8n.io/t/limit-parallels-http-requests/18568
Solving n8n “Existing execution data is too large” Error: The ... - tva.sg, accessed September 13, 2025, https://www.tva.sg/solving-n8n-existing-execution-data-is-too-large-error-the-complete-fix-for-self-hosted-instances/
Top n8n Productivity Tips for Enterprise Success - Medium, accessed September 13, 2025, https://medium.com/@dejanmarkovic_53716/top-n8n-productivity-tips-for-enterprise-success-6c412d2a8979
Advanced AI Workflow Automation Software & Tools - n8n, accessed September 13, 2025, https://n8n.io/ai/
Set Node vs. Code Node — Efficiency and Best Practices : r/n8n, accessed September 13, 2025, https://www.reddit.com/r/n8n/comments/1n338sd/set_node_vs_code_node_efficiency_and_best/
When to use n8n's HTTP batch request vs Loop Over Items nodes | Beyond the Code, accessed September 13, 2025, https://blog.julietedjere.com/posts/when-to-use-n8ns-http-batch-request-vs-loop-over-items-nodes
Game-Changing n8n Workflows Tips and Tricks for 2025 - Medium, accessed September 13, 2025, https://medium.com/@dejanmarkovic_53716/game-changing-n8n-workflows-tips-and-tricks-for-2025-02ebf08a607c
How to self-host n8n: Setup, architecture, and pricing guide (2025) | Blog - Northflank, accessed September 13, 2025, https://northflank.com/blog/how-to-self-host-n8n-setup-architecture-and-pricing-guide
N8n Deployment Guide: How To Set Up, Scale, And Maintain Your Automation Infrastructure, accessed September 13, 2025, https://groovetechnology.com/blog/software-development/n8n-deployment-guide-how-to-set-up-scale-and-maintain-your-automation-infrastructure/
Scaling n8n - n8n Docs, accessed September 13, 2025, https://docs.n8n.io/hosting/scaling/overview/
n8n Cost Optimization Strategies for Scale, accessed September 13, 2025, https://www.wednesday.is/writing-articles/n8n-cost-optimization-strategies-for-scale
How to increase n8n concurrent executions - Railway Help Station, accessed September 13, 2025, https://station.railway.com/questions/how-to-increase-n8n-concurrent-execution-1c5f5249
@n8n/n8n-benchmark - npm, accessed September 13, 2025, https://www.npmjs.com/package/@n8n/n8n-benchmark
