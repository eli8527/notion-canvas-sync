import assert from "node:assert/strict";
import test from "node:test";

import {
	buildCanvasStudentsUrl,
	canvasConfigFromEnv,
	fetchCanvasStudentPage,
	nextLink,
	type CanvasConfig,
} from "../src/canvas.js";

const config: CanvasConfig = {
	baseUrl: "https://school.instructure.com/",
	accessToken: "test-token",
	courseId: "42",
};

test("builds the active-student course URL", () => {
	const url = new URL(buildCanvasStudentsUrl(config));

	assert.equal(url.pathname, "/api/v1/courses/42/users");
	assert.deepEqual(url.searchParams.getAll("enrollment_type[]"), ["student"]);
	assert.deepEqual(url.searchParams.getAll("enrollment_state[]"), ["active"]);
	assert.deepEqual(url.searchParams.getAll("include[]"), ["avatar_url"]);
	assert.equal(url.searchParams.get("per_page"), "100");
});

test("parses Canvas's opaque next-page Link", () => {
	const header =
		'<https://school.instructure.com/api/v1/courses/42/users?page=1>; rel="current", ' +
		'<https://school.instructure.com/api/v1/courses/42/users?page=2&opaque=yes>; rel="next"';

	assert.equal(
		nextLink(header),
		"https://school.instructure.com/api/v1/courses/42/users?page=2&opaque=yes",
	);
	assert.equal(nextLink(null), undefined);
});

test("fetches and normalizes one Canvas page", async () => {
	const fetchFn: typeof fetch = async (input, init) => {
		assert.equal(input, buildCanvasStudentsUrl(config));
		assert.equal(
			new Headers(init?.headers).get("Authorization"),
			"Bearer test-token",
		);
		assert.equal(
			new Headers(init?.headers).get("Accept"),
			"application/json+canvas-string-ids",
		);

		return new Response(
			JSON.stringify([
				{
					id: 123,
					name: "Ada Lovelace",
					avatar_url: "https://cdn.example.edu/avatars/ada.png",
					sortable_name: "Lovelace, Ada",
					sis_user_id: "ada-1",
					login_id: "ada",
					email: "ada@example.edu",
				},
			]),
			{
				headers: {
					"content-type": "application/json",
					link: '<https://school.instructure.com/next?page=2>; rel="next"',
				},
			},
		);
	};

	const page = await fetchCanvasStudentPage(config, undefined, fetchFn);

	assert.deepEqual(page, {
		students: [
			{
				id: "123",
				name: "Ada Lovelace",
				avatarUrl: "https://cdn.example.edu/avatars/ada.png",
				sortableName: "Lovelace, Ada",
				sisUserId: "ada-1",
				loginId: "ada",
				email: "ada@example.edu",
			},
		],
		nextUrl: "https://school.instructure.com/next?page=2",
	});
});

test("refuses cross-origin pagination URLs before sending the token", async () => {
	let called = false;
	const fetchFn: typeof fetch = async () => {
		called = true;
		return new Response("[]");
	};

	await assert.rejects(
		fetchCanvasStudentPage(config, "https://attacker.example/next", fetchFn),
		/different origin/,
	);
	assert.equal(called, false);
});

test("requires all Canvas configuration", () => {
	assert.throws(
		() => canvasConfigFromEnv({ CANVAS_BASE_URL: config.baseUrl }),
		/Missing required environment variable: CANVAS_ACCESS_TOKEN/,
	);
});
