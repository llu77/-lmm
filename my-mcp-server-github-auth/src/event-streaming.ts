/**
 * Event Streaming Utility for Cloudflare Pipelines
 *
 * This module provides functions to stream authentication and usage events
 * to Cloudflare Pipelines for real-time analytics and monitoring.
 */

/**
 * Event types that can be streamed to the pipeline
 */
export enum EventType {
	// Authentication events
	AUTH_LOGIN_SUCCESS = "auth_login_success",
	AUTH_LOGIN_FAILURE = "auth_login_failure",
	AUTH_LOGOUT = "auth_logout",
	AUTH_SSH_SUCCESS = "auth_ssh_success",
	AUTH_SSH_FAILURE = "auth_ssh_failure",
	AUTH_GITHUB_SUCCESS = "auth_github_success",
	AUTH_GITHUB_FAILURE = "auth_github_failure",

	// MCP tool usage events
	TOOL_INVOKED = "tool_invoked",
	TOOL_SUCCESS = "tool_success",
	TOOL_FAILURE = "tool_failure",

	// OAuth events
	OAUTH_AUTHORIZE_START = "oauth_authorize_start",
	OAUTH_AUTHORIZE_COMPLETE = "oauth_authorize_complete",
	OAUTH_TOKEN_ISSUED = "oauth_token_issued",

	// Client events
	CLIENT_REGISTERED = "client_registered",
	CLIENT_APPROVED = "client_approved",
}

/**
 * Base event structure for pipeline streaming
 */
export interface BaseEvent {
	user_id: {
		login?: string;
		email?: string;
		client_id?: string;
	};
	event_name: EventType;
	timestamp?: string;
	metadata?: Record<string, any>;
}

/**
 * Authentication event structure
 */
export interface AuthEvent extends BaseEvent {
	user_id: {
		login: string;
		email: string;
		auth_method: "github" | "ssh";
	};
	event_name:
		| EventType.AUTH_LOGIN_SUCCESS
		| EventType.AUTH_LOGIN_FAILURE
		| EventType.AUTH_SSH_SUCCESS
		| EventType.AUTH_SSH_FAILURE
		| EventType.AUTH_GITHUB_SUCCESS
		| EventType.AUTH_GITHUB_FAILURE;
	metadata?: {
		ip_address?: string;
		user_agent?: string;
		error_message?: string;
	};
}

/**
 * Tool usage event structure
 */
export interface ToolEvent extends BaseEvent {
	user_id: {
		login: string;
		email: string;
	};
	event_name: EventType.TOOL_INVOKED | EventType.TOOL_SUCCESS | EventType.TOOL_FAILURE;
	metadata: {
		tool_name: string;
		execution_time_ms?: number;
		error_message?: string;
	};
}

/**
 * OAuth event structure
 */
export interface OAuthEvent extends BaseEvent {
	user_id: {
		login?: string;
		email?: string;
		client_id: string;
	};
	event_name:
		| EventType.OAUTH_AUTHORIZE_START
		| EventType.OAUTH_AUTHORIZE_COMPLETE
		| EventType.OAUTH_TOKEN_ISSUED;
	metadata?: {
		scope?: string;
		redirect_uri?: string;
	};
}

/**
 * Event streaming configuration
 */
export interface StreamingConfig {
	enabled: boolean;
	batchSize: number;
	flushInterval: number; // milliseconds
}

/**
 * Default streaming configuration
 */
const DEFAULT_CONFIG: StreamingConfig = {
	enabled: true,
	batchSize: 10,
	flushInterval: 5000,
};

/**
 * Stream an event to Cloudflare Pipeline
 */
export async function streamEvent(
	pipeline: any,
	event: BaseEvent,
	config: Partial<StreamingConfig> = {}
): Promise<void> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config };

	if (!finalConfig.enabled) {
		return;
	}

	// Add timestamp if not present
	if (!event.timestamp) {
		event.timestamp = new Date().toISOString();
	}

	try {
		await pipeline.send([event]);
	} catch (error) {
		console.error("Failed to stream event:", error);
		// Don't throw - we don't want streaming failures to break the main flow
	}
}

/**
 * Stream authentication success event
 */
export async function streamAuthSuccess(
	pipeline: any,
	user: { login: string; email: string; name: string },
	authMethod: "github" | "ssh",
	request: Request
): Promise<void> {
	const event: AuthEvent = {
		user_id: {
			login: user.login,
			email: user.email,
			auth_method: authMethod,
		},
		event_name: authMethod === "github"
			? EventType.AUTH_GITHUB_SUCCESS
			: EventType.AUTH_SSH_SUCCESS,
		metadata: {
			ip_address: request.headers.get("CF-Connecting-IP") || "unknown",
			user_agent: request.headers.get("User-Agent") || "unknown",
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream authentication failure event
 */
export async function streamAuthFailure(
	pipeline: any,
	authMethod: "github" | "ssh",
	errorMessage: string,
	request: Request
): Promise<void> {
	const event: AuthEvent = {
		user_id: {
			login: "unknown",
			email: "unknown",
			auth_method: authMethod,
		},
		event_name: authMethod === "github"
			? EventType.AUTH_GITHUB_FAILURE
			: EventType.AUTH_SSH_FAILURE,
		metadata: {
			ip_address: request.headers.get("CF-Connecting-IP") || "unknown",
			user_agent: request.headers.get("User-Agent") || "unknown",
			error_message: errorMessage,
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream tool invocation event
 */
export async function streamToolInvoked(
	pipeline: any,
	user: { login: string; email: string },
	toolName: string
): Promise<void> {
	const event: ToolEvent = {
		user_id: {
			login: user.login,
			email: user.email,
		},
		event_name: EventType.TOOL_INVOKED,
		metadata: {
			tool_name: toolName,
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream tool success event
 */
export async function streamToolSuccess(
	pipeline: any,
	user: { login: string; email: string },
	toolName: string,
	executionTimeMs: number
): Promise<void> {
	const event: ToolEvent = {
		user_id: {
			login: user.login,
			email: user.email,
		},
		event_name: EventType.TOOL_SUCCESS,
		metadata: {
			tool_name: toolName,
			execution_time_ms: executionTimeMs,
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream tool failure event
 */
export async function streamToolFailure(
	pipeline: any,
	user: { login: string; email: string },
	toolName: string,
	errorMessage: string
): Promise<void> {
	const event: ToolEvent = {
		user_id: {
			login: user.login,
			email: user.email,
		},
		event_name: EventType.TOOL_FAILURE,
		metadata: {
			tool_name: toolName,
			error_message: errorMessage,
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream OAuth authorization start event
 */
export async function streamOAuthStart(
	pipeline: any,
	clientId: string,
	scope?: string
): Promise<void> {
	const event: OAuthEvent = {
		user_id: {
			client_id: clientId,
		},
		event_name: EventType.OAUTH_AUTHORIZE_START,
		metadata: {
			scope,
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream OAuth authorization complete event
 */
export async function streamOAuthComplete(
	pipeline: any,
	user: { login: string; email: string },
	clientId: string
): Promise<void> {
	const event: OAuthEvent = {
		user_id: {
			login: user.login,
			email: user.email,
			client_id: clientId,
		},
		event_name: EventType.OAUTH_AUTHORIZE_COMPLETE,
	};

	await streamEvent(pipeline, event);
}

/**
 * Stream OAuth token issued event
 */
export async function streamTokenIssued(
	pipeline: any,
	user: { login: string; email: string },
	clientId: string,
	scope?: string
): Promise<void> {
	const event: OAuthEvent = {
		user_id: {
			login: user.login,
			email: user.email,
			client_id: clientId,
		},
		event_name: EventType.OAUTH_TOKEN_ISSUED,
		metadata: {
			scope,
		},
	};

	await streamEvent(pipeline, event);
}

/**
 * Batch event streaming for better performance
 */
export class EventBatcher {
	private events: BaseEvent[] = [];
	private flushTimer: number | null = null;
	private pipeline: any;
	private config: StreamingConfig;

	constructor(pipeline: any, config: Partial<StreamingConfig> = {}) {
		this.pipeline = pipeline;
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Add an event to the batch
	 */
	add(event: BaseEvent): void {
		if (!this.config.enabled) {
			return;
		}

		// Add timestamp if not present
		if (!event.timestamp) {
			event.timestamp = new Date().toISOString();
		}

		this.events.push(event);

		// Flush if batch size reached
		if (this.events.length >= this.config.batchSize) {
			this.flush();
		} else {
			// Schedule flush if not already scheduled
			this.scheduleFlush();
		}
	}

	/**
	 * Schedule a flush after the flush interval
	 */
	private scheduleFlush(): void {
		if (this.flushTimer === null) {
			this.flushTimer = setTimeout(() => {
				this.flush();
			}, this.config.flushInterval) as any;
		}
	}

	/**
	 * Flush all pending events to the pipeline
	 */
	async flush(): Promise<void> {
		if (this.events.length === 0) {
			return;
		}

		// Clear the flush timer
		if (this.flushTimer !== null) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}

		// Get events to send
		const eventsToSend = [...this.events];
		this.events = [];

		try {
			await this.pipeline.send(eventsToSend);
		} catch (error) {
			console.error("Failed to flush events:", error);
			// Don't throw - we don't want streaming failures to break the main flow
		}
	}
}
