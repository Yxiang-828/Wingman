# Wingman Command Guide

## Command Structure

```
/{table} /{filter_type} {parameter} [additional_options]
```

## Table Selectors

| Selector | Table           |
| -------- | --------------- |
| `/t`     | tasks           |
| `/e`     | calendar_events |
| `/d`     | diary_entries   |
| `/u`     | users           |

## Filter Types

### Date Filters

- `/m {month}`: Month filter (jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec or 01-12)
- `/d {date}`: Day filter (today, yest, tom or YYYY-MM-DD, MM-DD, DD)

### Status Filters

- `/st {status}`: Status filter
  - **Tasks**: pending, completed, failed
  - **Events**: upcoming, past

### Type Filters

- `/ty {type}`: Type filter
  - **Events**: Work, Meeting, Reminder
  - **Diary**: happy, excited, neutral, sad, anxious

### Search Filters

- `/s {search_term}`: Text search (e.g., meeting, budget)

### Display Options

- `/l {number}`: Limit results (1-100)

## Valid Command Combinations

### Tasks (`/t`)

- `/t /m {month}`
- `/t /d {date}`
- `/t /st {status}`
- `/t /s {search_term}`

**Combinations**: `/t /m {month} /st {status}`, `/t /st {status} /l {number}`, `/t /s {search_term} /l {number}`

### Calendar Events (`/e`)

- `/e /m {month}`
- `/e /d {date}`
- `/e /st {status}`
- `/e /ty {type}`
- `/e /s {search_term}`

**Combinations**: `/e /ty {type} /st {status}`, `/e /m {month} /ty {type}`, `/e /st {status} /l {number}`

### Diary Entries (`/d`)

- `/d /m {month}`
- `/d /d {date}`
- `/d /ty {mood}`
- `/d /s {search_term}`

**Combinations**: `/d /m {month} /ty {mood}`, `/d /ty {mood} /l {number}`, `/d /s {search_term} /m {month}`

### Users (`/u`)

- `/u /{column}`: Specific column for the current user (e.g., username, email, name, password, created)

**Note**: `/u` alone requires a column specification.

## Examples with Results

### `/t /d today`

List of tasks due today.

### `/e /st upcoming /l 5`

List of 5 upcoming events.

### `/d /ty happy`

List of diary entries with a "happy" mood.

### `/u /username`

The username of the current user.

### `/u /email`

The email of the current user.
