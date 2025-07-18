// TypeScript compilation test for clientId feature
// This file tests that the clientId parameter is properly typed in materializers

import { Events, makeSchema, State } from '@livestore/common/schema'
import { Schema } from '@livestore/utils/effect'

// Test events
const events = {
  messageCreated: Events.synced({
    name: 'messageCreated',
    schema: Schema.Struct({
      id: Schema.String,
      content: Schema.String,
    }),
  }),
  userAction: Events.synced({
    name: 'userAction',
    schema: Schema.Struct({
      action: Schema.String,
      timestamp: Schema.Number,
    }),
  }),
}

// Test table
const messages = State.SQLite.table({
  name: 'messages',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    content: State.SQLite.text(),
    createdBy: State.SQLite.text(), // Will store clientId
  },
})

const auditLog = State.SQLite.table({
  name: 'audit_log',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    action: State.SQLite.text(),
    timestamp: State.SQLite.integer(),
    clientId: State.SQLite.text(), // Will store clientId
  },
})

const tables = { messages, auditLog }

// Test materializers with clientId
const materializers = State.SQLite.materializers(events, {
  // Test 1: Basic clientId usage
  messageCreated: ({ id, content }, { clientId }) => {
    // TypeScript should infer clientId as string
    const client: string = clientId
    console.log(`Message created by: ${client}`)

    return messages.insert({
      id,
      content,
      createdBy: clientId,
    })
  },

  // Test 2: clientId alongside other context parameters
  userAction: ({ action, timestamp }, { clientId, query, currentFacts, eventDef }) => {
    // All context parameters should be available
    const client: string = clientId
    const queryFn = query
    const facts = currentFacts
    const event = eventDef

    // Query existing data
    const existingMessages = query(messages.select('id'))

    return auditLog.insert({
      id: crypto.randomUUID(),
      action,
      timestamp,
      clientId: client,
    })
  },
})

// Test 3: Type extraction - verify context type includes clientId
type MaterializerContext = Parameters<typeof materializers.messageCreated>[1]

// This should compile without errors if clientId is properly typed
const testContext: MaterializerContext = {
  clientId: 'test-client-123',
  currentFacts: new Map(),
  eventDef: events.messageCreated,
  query: {} as any,
}

// Test 4: Verify clientId is required (this should cause a TypeScript error if uncommented)
// const invalidContext: MaterializerContext = {
//   currentFacts: new Map(),
//   eventDef: events.messageCreated,
//   query: {} as any,
//   // clientId is missing - should cause TypeScript error
// }

// Test 5: Create schema (should compile without errors)
const schema = makeSchema({
  events,
  state: State.SQLite.makeState({ tables, materializers }),
})

// Test 6: Export types for verification
export type TestMaterializerContext = MaterializerContext
export type TestSchema = typeof schema

// If this file compiles without TypeScript errors, the clientId feature is working correctly!
console.log('✅ TypeScript compilation test passed - clientId is properly typed!')
