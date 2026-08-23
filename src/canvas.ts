export type CanvasConfig = {
	baseUrl: string;
	accessToken: string;
	courseId: string;
};

export type CanvasStudent = {
	id: string;
	name: string;
	avatarUrl?: string;
	sortableName?: string;
	sisUserId?: string;
	loginId?: string;
	email?: string;
};

export type CanvasStudentPage = {
	students: CanvasStudent[];
	nextUrl?: string;
};

export type CanvasSyncState = {
	nextUrl: string;
};

type Environment = Record<string, string | undefined>;
type Fetch = typeof fetch;

export function canvasConfigFromEnv(env: Environment): CanvasConfig {
	return {
		baseUrl: requiredEnv(env, "CANVAS_BASE_URL"),
		accessToken: requiredEnv(env, "CANVAS_ACCESS_TOKEN"),
		courseId: requiredEnv(env, "CANVAS_COURSE_ID"),
	};
}

export function buildCanvasStudentsUrl(config: CanvasConfig): string {
	const baseUrl = validatedBaseUrl(config.baseUrl);
	const url = new URL(
		`/api/v1/courses/${encodeURIComponent(config.courseId)}/users`,
		baseUrl,
	);

	url.searchParams.append("enrollment_type[]", "student");
	url.searchParams.append("enrollment_state[]", "active");
	url.searchParams.append("include[]", "avatar_url");
	url.searchParams.set("per_page", "100");

	return url.toString();
}

export async function fetchCanvasStudentPage(
	config: CanvasConfig,
	nextUrl?: string,
	fetchFn: Fetch = fetch,
): Promise<CanvasStudentPage> {
	const baseUrl = validatedBaseUrl(config.baseUrl);
	const requestUrl = nextUrl ?? buildCanvasStudentsUrl(config);
	assertSameOrigin(requestUrl, baseUrl);

	const response = await fetchFn(requestUrl, {
		headers: {
			Accept: "application/json+canvas-string-ids",
			Authorization: `Bearer ${config.accessToken}`,
		},
	});

	if (!response.ok) {
		const details = (await response.text()).slice(0, 500).trim();
		throw new Error(
			`Canvas API request failed (${response.status} ${response.statusText})${
				details ? `: ${details}` : ""
			}`,
		);
	}

	const body: unknown = await response.json();
	if (!Array.isArray(body)) {
		throw new Error("Canvas API returned an unexpected response shape");
	}

	const parsedNextUrl = nextLink(response.headers.get("link"));
	if (parsedNextUrl) {
		assertSameOrigin(parsedNextUrl, baseUrl);
	}

	return {
		students: body.map(normalizeStudent),
		nextUrl: parsedNextUrl,
	};
}

export function nextLink(linkHeader: string | null): string | undefined {
	if (!linkHeader) {
		return undefined;
	}

	const links = linkHeader.matchAll(/<([^>]+)>\s*;\s*rel="([^"]+)"/g);
	for (const match of links) {
		if (match[2] === "next") {
			return match[1];
		}
	}

	return undefined;
}

function requiredEnv(env: Environment, name: string): string {
	const value = env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function validatedBaseUrl(value: string): URL {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("CANVAS_BASE_URL must be a valid URL");
	}

	if (url.protocol !== "https:") {
		throw new Error("CANVAS_BASE_URL must use HTTPS");
	}

	return url;
}

function assertSameOrigin(value: string, baseUrl: URL): void {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("Canvas returned an invalid pagination URL");
	}

	if (url.origin !== baseUrl.origin) {
		throw new Error("Canvas returned a pagination URL on a different origin");
	}
}

function normalizeStudent(value: unknown): CanvasStudent {
	if (!isRecord(value)) {
		throw new Error("Canvas API returned an invalid student record");
	}

	const id = stringValue(value.id);
	const name = stringValue(value.name);
	if (!id || !name) {
		throw new Error("Canvas student records must include id and name");
	}

	return {
		id,
		name,
		avatarUrl: optionalHttpsUrl(value.avatar_url),
		sortableName: optionalString(value.sortable_name),
		sisUserId: optionalString(value.sis_user_id),
		loginId: optionalString(value.login_id),
		email: optionalString(value.email),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return undefined;
}

function optionalString(value: unknown): string | undefined {
	const result = stringValue(value)?.trim();
	return result || undefined;
}

function optionalHttpsUrl(value: unknown): string | undefined {
	const result = optionalString(value);
	if (!result) {
		return undefined;
	}

	try {
		const url = new URL(result);
		return url.protocol === "https:" ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}
