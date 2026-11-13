import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dbPath = fileURLToPath(new URL('../mock/db.json', import.meta.url))
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
const errors = []
const tableNames = [
  'users',
  'cases',
  'conversations',
  'messages',
  'courses',
  'favorites',
  'records',
  'videos',
  'questionStats',
  'knowledgeWeakness',
  'questions',
  'papers',
  'quizAttempts',
  'pointLogs',
  'teachingRecords',
  'tutoringRecords',
]

const fail = (message) => errors.push(message)
const hasId = (table, id) => db[table].some((row) => row.id === id)

if (!db || typeof db !== 'object' || Array.isArray(db)) {
  throw new Error('mock/db.json must contain a JSON object of tables')
}

for (const table of tableNames) {
  if (!Array.isArray(db[table])) {
    fail(`${table} must be an array`)
    db[table] = []
    continue
  }

  const ids = new Set()
  for (const [index, row] of db[table].entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      fail(`${table}[${index}] must be an object`)
      continue
    }
    if (row.id == null || row.id === '') {
      fail(`${table}[${index}] is missing id`)
    } else if (ids.has(row.id)) {
      fail(`${table} has duplicate id ${row.id}`)
    } else {
      ids.add(row.id)
    }
  }
}

if (Array.isArray(db.users)) {
  const usernames = new Set()
  for (const user of db.users) {
    if (!user.username) {
      fail(`user ${user.id} is missing username`)
    } else if (usernames.has(user.username)) {
      fail(`duplicate username ${user.username}`)
    } else {
      usernames.add(user.username)
    }

    for (const courseId of user.progress?.completedCourseIds || []) {
      if (!hasId('courses', courseId)) fail(`user ${user.id} references missing course ${courseId}`)
    }
  }
}

const foreignKeys = [
  ['courses', 'caseIds', 'cases', true],
  ['favorites', 'userId', 'users'],
  ['favorites', 'caseId', 'cases'],
  ['records', 'userId', 'users'],
  ['records', 'caseId', 'cases'],
  ['videos', 'caseId', 'cases'],
  ['questionStats', 'caseId', 'cases'],
  ['knowledgeWeakness', 'courseId', 'courses'],
  ['knowledgeWeakness', 'caseId', 'cases'],
  ['questions', 'caseId', 'cases'],
  ['papers', 'teacherId', 'users'],
  ['papers', 'questionIds', 'questions', true],
  ['quizAttempts', 'userId', 'users'],
  ['quizAttempts', 'paperId', 'papers'],
  ['quizAttempts', 'wrongQuestionIds', 'questions', true],
  ['pointLogs', 'userId', 'users'],
  ['messages', 'conversationId', 'conversations'],
  ['messages', 'refCaseId', 'cases'],
]

for (const [table, field, target, isArray = false] of foreignKeys) {
  if (!Array.isArray(db[table])) continue
  for (const row of db[table]) {
    const values = isArray ? row[field] || [] : [row[field]]
    for (const id of values) {
      if (id == null && !isArray) continue
      if (!hasId(target, id)) {
        fail(`${table} ${row.id} references missing ${target} ${id}`)
      }
    }
  }
}

if (Array.isArray(db.papers)) {
  for (const paper of db.papers) {
    if (!Array.isArray(paper.questionIds)) {
      fail(`paper ${paper.id} questionIds must be an array`)
      continue
    }
    if (paper.questionIds.length < 5) fail(`paper ${paper.id} has fewer than 5 questions`)
    if (paper.count !== paper.questionIds.length) {
      fail(`paper ${paper.id} count does not match questionIds`)
    }
    if (!Number.isFinite(paper.scoreTotal) || paper.scoreTotal <= 0) {
      fail(`paper ${paper.id} has invalid scoreTotal`)
    }
    if (!Number.isFinite(paper.durationMin) || paper.durationMin <= 0) {
      fail(`paper ${paper.id} has invalid durationMin`)
    }
    if (new Set(paper.questionIds).size !== paper.questionIds.length) {
      fail(`paper ${paper.id} contains duplicate questionIds`)
    }

    const teacher = db.users.find((user) => user.id === paper.teacherId)
    if (teacher && teacher.role !== 'teacher') {
      fail(`paper ${paper.id} owner ${paper.teacherId} is not a teacher`)
    }
  }
}

if (Array.isArray(db.quizAttempts)) {
  for (const attempt of db.quizAttempts) {
    if (attempt.mode !== 'assigned' || attempt.paperId == null) continue
    const paper = db.papers.find((row) => row.id === attempt.paperId)
    if (!paper) continue
    if (attempt.total !== paper.scoreTotal) {
      fail(`attempt ${attempt.id} total does not match paper ${paper.id}`)
    }
    if (
      Number.isFinite(attempt.correctCount) &&
      Number.isFinite(attempt.questionCount) &&
      attempt.questionCount > 0
    ) {
      const expectedScore =
        Math.round((attempt.correctCount / attempt.questionCount) * attempt.total * 100) / 100
      if (attempt.score !== expectedScore) {
        fail(`attempt ${attempt.id} score does not match its correct-answer ratio`)
      }
    }
    if (Array.isArray(attempt.detail)) {
      if (attempt.questionCount != null && attempt.questionCount !== attempt.detail.length) {
        fail(`attempt ${attempt.id} questionCount does not match detail`)
      }
      if (
        Number.isFinite(attempt.correctCount) &&
        attempt.correctCount !== attempt.detail.filter((item) => item.correct).length
      ) {
        fail(`attempt ${attempt.id} correctCount does not match detail`)
      }
    }
  }
}

if (errors.length) {
  process.stderr.write(
    `Database validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n`,
  )
  for (const error of errors) process.stderr.write(`- ${error}\n`)
  process.exitCode = 1
} else {
  const counts = tableNames.map((table) => `${table}=${db[table].length}`).join(', ')
  process.stdout.write(`Database validation passed: ${counts}\n`)
}
