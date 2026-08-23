import { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";

import {
	canvasConfigFromEnv,
	fetchCanvasStudentPage,
	type CanvasSyncState,
} from "./canvas.js";

const worker = new Worker();
export default worker;

const students = worker.database("canvasStudents", {
	type: "managed",
	initialTitle: "Canvas Students",
	primaryKeyProperty: "Canvas User ID",
	schema: {
		properties: {
			Name: Schema.title(),
			"Canvas User ID": Schema.richText(),
			"SIS User ID": Schema.richText(),
			"Login ID": Schema.richText(),
			Email: Schema.email(),
			"Sortable Name": Schema.richText(),
		},
	},
});

// Canvas uses dynamic request-cost throttling. Keeping requests sequential and
// one second apart is conservative and matches Canvas's guidance.
const canvasApi = worker.pacer("canvasApi", {
	allowedRequests: 1,
	intervalMs: 1000,
});

worker.sync("canvasStudentsSync", {
	database: students,
	mode: "replace",
	schedule: "1h",
	execute: async (state: CanvasSyncState | undefined) => {
		await canvasApi.wait();
		const page = await fetchCanvasStudentPage(
			canvasConfigFromEnv(process.env),
			state?.nextUrl,
		);

		return {
			changes: page.students.map((student) => ({
				type: "upsert" as const,
				key: student.id,
				...(student.avatarUrl
					? { icon: Builder.imageIcon(student.avatarUrl) }
					: {}),
				properties: {
					Name: Builder.title(student.name),
					"Canvas User ID": Builder.richText(student.id),
					"SIS User ID": Builder.richText(student.sisUserId ?? ""),
					"Login ID": Builder.richText(student.loginId ?? ""),
					Email: Builder.email(student.email ?? ""),
					"Sortable Name": Builder.richText(student.sortableName ?? ""),
				},
			})),
			hasMore: page.nextUrl !== undefined,
			nextState: page.nextUrl ? { nextUrl: page.nextUrl } : undefined,
		};
	},
});
