# Notion Canvas Sync

[![CI](https://github.com/eli8527/notion-canvas-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/eli8527/notion-canvas-sync/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A small [Notion Worker](https://developers.notion.com/workers/get-started/overview) that syncs the active students in one Canvas LMS course into a managed Notion database.

## What it does

- Runs hourly using a replace-mode sync.
- Imports only active student enrollments from one course.
- Uses the Canvas user ID as a stable primary key.
- Uses each student's Canvas profile picture as the Notion page icon.
- Paginates through large rosters and removes students who are no longer active after a successful full sync.
- Applies conservative Canvas API pacing and refuses cross-origin pagination URLs before sending credentials.

This project is intentionally one-way: Canvas is the source of truth and the Worker writes roster data into Notion. It does not currently update Canvas grades or attendance.

## Requirements

- Node.js 22 or newer and npm 10.9.2 or newer
- The [`ntn` CLI](https://developers.notion.com/cli/get-started)
- A Notion Business or Enterprise workspace with Workers enabled
- A Canvas access token that can view the selected course roster

## Quick start

```shell
git clone git@github.com:eli8527/notion-canvas-sync.git
cd notion-canvas-sync
npm ci
cp .env.example .env
```

Fill in `.env` with your Canvas instance, token, and course ID:

```dotenv
CANVAS_BASE_URL=https://school.instructure.com
CANVAS_ACCESS_TOKEN=replace_with_your_token
CANVAS_COURSE_ID=12345
```

`CANVAS_BASE_URL` must be an HTTPS origin. The course ID is the number in a Canvas URL such as `/courses/12345`.

Never commit `.env` or paste an active Canvas token into an issue, pull request, or log. Prefer a dedicated, least-privilege token and rotate it immediately if it is exposed.

## Test locally

```shell
npm run check
npm test
npm run build
ntn workers sync trigger canvasStudentsSync --preview --local
```

The preview calls Canvas and displays the proposed changes without writing anything to Notion. Local Worker execution loads `.env` automatically.

## Deploy

Authenticate and create the Worker:

```shell
ntn login
ntn workers deploy --name canvas-students
```

Push the Canvas configuration to the hosted runtime, then preview the deployed sync:

```shell
ntn workers env push
ntn workers sync trigger canvasStudentsSync --preview
```

When the preview is correct, perform the initial write and check its health:

```shell
ntn workers sync trigger canvasStudentsSync
ntn workers sync status canvasStudentsSync --no-watch
```

Later code updates use `ntn workers deploy` without `--name`. The CLI stores the local deployment identity in `workers.json`; that file is ignored because it is specific to one Notion workspace.

## Synced data

| Notion value | Canvas field |
| --- | --- |
| Page title | `name` |
| Page icon | `avatar_url` |
| Canvas User ID | `id` |
| SIS User ID | `sis_user_id` |
| Login ID | `login_id` |
| Email | `email` |
| Sortable Name | `sortable_name` |

The database is initially named `Canvas Students`. Change `initialTitle` in [`src/index.ts`](src/index.ts) before the first deployment if you want a different name.

## Configuration and behavior

- The sync schedule is set in [`src/index.ts`](src/index.ts).
- Canvas request construction, validation, normalization, and pagination live in [`src/canvas.ts`](src/canvas.ts).
- The Canvas API token is sent only to the configured Canvas origin.
- Only HTTPS base URLs and avatar URLs are accepted.
- Canvas's default avatar is used when a student has not selected a custom profile picture.

## Contributing

Bug reports and focused pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before contributing.

## License

[MIT](LICENSE)
