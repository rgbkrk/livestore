import { Events, makeSchema, Schema, State } from '@livestore/common/schema'

// Define events
const events = {
  messageCreated: Events.synced({
    name: 'messageCreated',
    schema: Schema.Struct({
      id: Schema.String,
      content: Schema.String,
      timestamp: Schema.Number,
    }),
  }),
  userJoined: Events.synced({
    name: 'userJoined',
    schema: Schema.Struct({
      userId: Schema.String,
      username: Schema.String,
    }),
  }),
}

// Define tables
const messages = State.SQLite.table({
  name: 'messages',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    content: State.SQLite.text(),
    timestamp: State.SQLite.integer(),
    createdBy: State.SQLite.text(), // Store the clientId for attribution
  },
})

const users = State.SQLite.table({
  name: 'users',
  columns: {
    userId: State.SQLite.text({ primaryKey: true }),
    username: State.SQLite.text(),
    joinedViaClient: State.SQLite.text(), // Store the clientId for attribution
  },
})

const tables = { messages, users }

// Define materializers with clientId access
const materializers = State.SQLite.materializers(events, {
  messageCreated: ({ id, content, timestamp }, { clientId }) => {
    // 🎉 clientId is now available in the materializer context!
    console.log(`📨 Message "${content}" created by client: ${clientId}`)

    // You can use clientId for:
    // - Attribution tracking
    // - Audit logging
    // - Authorization checks
    // - Analytics

    return messages.insert({
      id,
      content,
      timestamp,
      createdBy: clientId, // Store for attribution
    })
  },

  userJoined: ({ userId, username }, { clientId }) => {
    // 🎉 clientId is available in all materializers!
    console.log(`👤 User "${username}" joined via client: ${clientId}`)

    // Example: Track which client facilitated the user joining
    return users.insert({
      userId,
      username,
      joinedViaClient: clientId,
    })
  },
})

// Create schema
const schema = makeSchema({
  events,
  state: State.SQLite.makeState({ tables, materializers }),
})

// Export for use
export { schema, events, tables }

// Type demonstration - this shows the clientId is properly typed
type MaterializerContext = Parameters<typeof materializers.messageCreated>[1]
// MaterializerContext now includes:
// - currentFacts: EventDefFacts
// - eventDef: EventDef
// - query: MaterializerContextQuery
// - clientId: string  <-- NEW!

console.log('✅ ClientId feature successfully integrated!')
console.log('🎯 Key benefits:')
console.log('  • Track which client created each event')
console.log('  • Build comprehensive audit trails')
console.log('  • Implement client-specific authorization')
console.log('  • Enable better debugging and analytics')
console.log('  • Fully backward compatible - existing code continues to work')
