# WINGMAN COMMAND MANUAL

## Version 2.0 - Database Query System

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Command Structure](#command-structure)
3. [Table Selectors](#table-selectors)
4. [Filter Types](#filter-types)
5. [Valid Command Combinations](#valid-command-combinations)
6. [Command Examples](#command-examples)
7. [Error Handling](#error-handling)
8. [Database Schema Reference](#database-schema-reference)

---

## OVERVIEW

The Wingman Database Query System provides a structured command interface for accessing personal productivity data. All commands follow a strict hierarchical ordering system with validation to ensure data integrity and performance.

### Current Database Stats

- **Tasks**: 258 records
- **Calendar Events**: 38 records
- **Diary Entries**: 45 records
- **Chat History**: 422 records
- **Users**: 16 records

---

## COMMAND STRUCTURE

### Syntax Format

```
/{table} /{filter_type} {parameter} [additional_options]
```

### Command Hierarchy (Descending Priority)

1. **Table Selector** (Required) - Must be first
2. **Filter Type** (Required) - Specifies query criteria
3. **Filter Parameter** (Required) - The actual filter value
4. **Additional Options** (Optional) - Display modifiers

**CRITICAL**: Commands violating this ordering will be rejected.

---

## TABLE SELECTORS

| Selector | Table           | Description               | Record Count |
| -------- | --------------- | ------------------------- | ------------ |
| `/t`     | tasks           | Personal task management  | 258          |
| `/e`     | calendar_events | Calendar and events       | 38           |
| `/d`     | diary_entries   | Personal diary entries    | 45           |
| `/c`     | chat_history    | Chat conversation history | 422          |
| `/u`     | users           | User account information  | 16           |

---

## FILTER TYPES

### Date Filters

#### Month Filter: `/m`

**Fixed Parameters:**

```
jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
```

#### Day Filter: `/d`

**Fixed Parameters:**

```
today, yest, tom
```

**Variable Parameters:**

```
{YYYY-MM-DD}    # Full date format (e.g., 2025-07-21)
{MM-DD}         # Current year assumed (2025-MM-DD)
{DD}            # Current year and current month assumed (2025-07-DD)
```

### Status Filters

#### Status Filter: `/st`

**For Tasks (`/t`):**

- `pending` - Not completed and not failed
- `completed` - Successfully finished tasks
- `failed` - Tasks marked as failed

**For Events (`/e`):**

- `upcoming` - Events from today onwards
- `past` - Events before today

### Type Filters

#### Type Filter: `/ty`

**For Events (`/e`):**

```
Work, Meeting, Reminder
```

**For Diary (`/d`):**

```
happy, excited, neutral, sad, anxious
```

**Not applicable for**: Tasks (`/t`), Chat (`/c`), Users (`/u`)

### Search Filters

#### Text Search: `/s`

**Variable Parameter:**

```
{search_term}    # Any text string to search for
```

**Searches in:**

- Tasks: title field
- Events: title and description fields
- Diary: title and content fields
- Chat: message content

### Display Options

#### Limit: `/l`

**Parameter Range:** `1-100` (default: 50)

```
{number}    # Maximum results to return
```

---

## VALID COMMAND COMBINATIONS

### Tasks (`/t`)

| Filter Combination                    | Example                       | Description             |
| ------------------------------------- | ----------------------------- | ----------------------- |
| `/t /m {month}`                       | `/t /m aug`                   | All August tasks        |
| `/t /d {date}`                        | `/t /d today`                 | Tasks for specific date |
| `/t /st {status}`                     | `/t /st pending`              | Tasks by status         |
| `/t /s {term}`                        | `/t /s meeting`               | Text search in tasks    |
| `/t /m {month} /st {status}`          | `/t /m jul /st completed`     | Monthly status filter   |
| `/t /st {status} /l {num}`            | `/t /st pending /l 20`        | Limited status results  |
| `/t /s {term} /l {num}`               | `/t /s budget /l 10`          | Limited search results  |
| `/t /m {month} /st {status} /l {num}` | `/t /m aug /st pending /l 50` | Full combination        |

### Calendar Events (`/e`)

| Filter Combination           | Example                    | Description             |
| ---------------------------- | -------------------------- | ----------------------- |
| `/e /m {month}`              | `/e /m dec`                | All December events     |
| `/e /d {date}`               | `/e /d tom`                | Tomorrow's events       |
| `/e /st {status}`            | `/e /st upcoming`          | Upcoming/past events    |
| `/e /ty {type}`              | `/e /ty Meeting`           | Events by type          |
| `/e /s {term}`               | `/e /s presentation`       | Text search in events   |
| `/e /ty {type} /st {status}` | `/e /ty Work /st upcoming` | Type + status combo     |
| `/e /m {month} /ty {type}`   | `/e /m aug /ty Meeting`    | Monthly type filter     |
| `/e /st {status} /l {num}`   | `/e /st upcoming /l 5`     | Limited upcoming events |

### Diary Entries (`/d`)

| Filter Combination         | Example                 | Description          |
| -------------------------- | ----------------------- | -------------------- |
| `/d /m {month}`            | `/d /m jun`             | All June entries     |
| `/d /d {date}`             | `/d /d yest`            | Yesterday's entries  |
| `/d /ty {mood}`            | `/d /ty happy`          | Entries by mood      |
| `/d /s {term}`             | `/d /s work`            | Text search in diary |
| `/d /m {month} /ty {mood}` | `/d /m jul /ty excited` | Monthly mood filter  |
| `/d /ty {mood} /l {num}`   | `/d /ty neutral /l 15`  | Limited mood entries |
| `/d /s {term} /m {month}`  | `/d /s project /m aug`  | Monthly text search  |

### Chat History (`/c`)

| Filter Combination       | Example             | Description            |
| ------------------------ | ------------------- | ---------------------- |
| `/c /m {month}`          | `/c /m jul`         | July chat messages     |
| `/c /d {date}`           | `/c /d today`       | Today's chat           |
| `/c /s {term}`           | `/c /s help`        | Search chat content    |
| `/c /s {term} /l {num}`  | `/c /s error /l 25` | Limited search results |
| `/c /m {month} /l {num}` | `/c /m jun /l 100`  | Monthly chat limit     |

### Users (`/u`) - Special Column Access

**IMPORTANT**: Users table only accepts two command formats - no other filters allowed.

#### Valid User Commands (Only These Two)

| Command Format | Example        | Description             |
| -------------- | -------------- | ----------------------- |
| `/u`           | `/u`           | All users (all columns) |
| `/u /{column}` | `/u /username` | Specific column only    |

#### User Column Selectors

| Subcommand     | Column     | Description                  |
| -------------- | ---------- | ---------------------------- |
| `/u /username` | username   | Display usernames only       |
| `/u /email`    | email      | Display email addresses only |
| `/u /name`     | name       | Display full names only      |
| `/u /password` | password   | Display passwords only       |
| `/u /created`  | created_at | Display creation dates only  |

**INVALID**: Cannot combine with `/l`, `/s`, `/m`, `/d`, `/st`, or `/ty`

---

## COMMAND EXAMPLES

### Daily Operations

```bash
# Check today's schedule
/t /d today                  # Today's tasks
/e /d today                  # Today's events
/d /d today                  # Today's diary entry

# Review pending work
/t /st pending /l 10         # Next 10 pending tasks
/e /st upcoming /l 5         # Next 5 upcoming events
```

### Weekly/Monthly Reviews

```bash
# July review
/t /m jul /st completed      # July completed tasks
/d /m jul                    # July diary entries
/e /m jul /ty Meeting        # July meetings

# August planning
/t /m aug /st pending        # August pending tasks
/e /m aug /st upcoming       # August upcoming events
```

### Search Operations

```bash
# Find specific content
/t /s budget                 # Budget-related tasks
/d /s meeting                # Diary entries about meetings
/c /s error                  # Chat messages about errors
/e /s presentation           # Presentation events
```

### Advanced Queries

```bash
# Complex combinations
/t /m dec /st pending /l 100     # December pending tasks (max 100)
/e /ty Work /st upcoming /l 20   # Next 20 work events
/d /ty excited /m jul            # July excited diary entries
/c /s wingman /l 50              # Recent wingman chats

# User column access
/u                               # All users (all columns)
/u /username                     # All usernames only
/u /email                        # All email addresses only
/u /created                      # All user creation dates only
```

---

## ERROR HANDLING

### Command Structure Violations

| Invalid Command  | Error Reason        | Correct Format   |
| ---------------- | ------------------- | ---------------- |
| `/m aug /t`      | Table must be first | `/t /m aug`      |
| `/st pending /t` | Table must be first | `/t /st pending` |
| `/t aug`         | Missing filter type | `/t /m aug`      |
| `/t /m`          | Missing parameter   | `/t /m aug`      |

### Invalid Parameters

| Invalid Command  | Error Reason       | Valid Options              |
| ---------------- | ------------------ | -------------------------- |
| `/t /m invalid`  | Invalid month      | `jan-dec` or `01-12`       |
| `/t /st running` | Invalid status     | `pending/completed/failed` |
| `/e /ty Finance` | Invalid event type | `Work/Meeting/Reminder`    |
| `/t /l 1000`     | Limit too high     | `1-100`                    |

### Filter Conflicts

| Invalid Command                | Error Reason             | Solution            |
| ------------------------------ | ------------------------ | ------------------- |
| `/t /m aug /d today`           | Cannot combine month/day | Use one date filter |
| `/t /st pending /st completed` | Duplicate filter type    | Use single status   |
| `/e /ty Work /ty Meeting`      | Multiple types           | Choose one type     |

### Table-Filter Incompatibility

| Invalid Command     | Error Reason                              | Valid Alternative      |
| ------------------- | ----------------------------------------- | ---------------------- |
| `/u /st pending`    | Users only accept base or column commands | `/u` or `/u /username` |
| `/u /l 10`          | Users cannot use limit filter             | `/u` or `/u /email`    |
| `/u /username /l 5` | Users cannot combine filters              | `/u /username`         |
| `/c /ty Meeting`    | Chat has no types                         | `/c /s meeting`        |
| `/t /ty Work`       | Tasks have no type filter                 | `/t /s work`           |
| `/d /st pending`    | Diary has no status                       | `/d /ty happy`         |

---

## DATABASE SCHEMA REFERENCE

### Tasks Table Structure

```sql
- id: INTEGER PRIMARY KEY
- user_id: TEXT (UUID)
- title: TEXT
- task_date: TEXT (YYYY-MM-DD)
- task_time: TEXT (HH:MM)
- completed: BOOLEAN (0/1)
- failed: BOOLEAN (0/1)
- task_type: TEXT
- created_at: TEXT (ISO timestamp)
- updated_at: TEXT (ISO timestamp)
```

### Calendar Events Table Structure

```sql
- id: INTEGER PRIMARY KEY
- user_id: TEXT (UUID)
- title: TEXT
- event_date: TEXT (YYYY-MM-DD)
- event_time: TEXT (HH:MM)
- type: TEXT (Work/Meeting/Reminder)
- description: TEXT
- created_at: TEXT (ISO timestamp)
- updated_at: TEXT (ISO timestamp)
```

### Diary Entries Table Structure

```sql
- id: INTEGER PRIMARY KEY
- user_id: TEXT (UUID)
- entry_date: TEXT (YYYY-MM-DD)
- title: TEXT
- content: TEXT
- mood: TEXT (happy/excited/neutral)
- created_at: TEXT (ISO timestamp)
- updated_at: TEXT (ISO timestamp)
```

### Chat History Table Structure

```sql
- id: INTEGER PRIMARY KEY
- user_id: TEXT (UUID)
- message: TEXT
- timestamp: TEXT (ISO timestamp)
- is_ai: BOOLEAN (0=user, 1=ai)
```

### Users Table Structure

```sql
- id: TEXT PRIMARY KEY (UUID)
- username: TEXT
- email: TEXT
- name: TEXT
- password: TEXT
- created_at: TEXT (ISO timestamp)
- updated_at: TEXT (ISO timestamp)
- last_synced_at: TEXT (ISO timestamp)
```

---

## PERFORMANCE NOTES

- **Query Optimization**: All date and user_id fields are indexed
- **Result Limits**: Default 50 records, maximum 100 to prevent performance issues
- **Search Performance**: Full-text search available on title and content fields
- **Data Security**: Users can only access their own data based on user_id

---
