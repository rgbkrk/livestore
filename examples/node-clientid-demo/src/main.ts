import { makeAdapter } from '@livestore/adapter-node'
import { Events, makeSchema, State } from '@livestore/common/schema'
import { createStore } from '@livestore/livestore'
import { Schema } from '@livestore/utils/effect'

console.log('🚀 LiveStore clientId Demo')
console.log('=' .repeat(50))

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
    createdBy: State.SQLite.text(), // This will store the clientId
  },
})

const users = State.SQLite.table({
  name: 'users',
  columns: {
    userId: State.SQLite.text({ primaryKey: true }),
    username: State.SQLite.text(),
    joinedViaClient: State.SQLite.text(), // This will store the clientId
  },
})

const tables = { messages, users }

// Define materializers with clientId access
const materializers = State.SQLite.materializers(events, {
  messageCreated: ({ id, content, timestamp }, { clientId }) => {
    console.log(`📨 Message "${content}" created by client: ${clientId}`)

    // Insert the message with attribution
    return messages.insert({
      id,
      content,
      timestamp,
      createdBy: clientId,
    })
  },

  userJoined: ({ userId, username }, { clientId }) => {
    console.log(`👤 User "${username}" joined via client: ${clientId}`)

    // Insert the user with client attribution
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

async function runDemo() {
  console.log('\n📋 Creating store...')

  const adapter = makeAdapter({ storage: { type: 'in-memory' } })
  const store = await createStore({
    schema,
    adapter,
    storeId: 'clientid-demo',
  })

  console.log(`🆔 Store created with clientId: ${store.clientId}`)
  console.log(`📋 Session ID: ${store.sessionId}`)

  console.log('\n🎯 Committing events...')

  // Commit some events
  store.commit(
    events.userJoined({
      userId: 'user-1',
      username: 'Alice'
    })
  )

  store.commit(
    events.messageCreated({
      id: 'msg-1',
      content: 'Hello everyone!',
      timestamp: Date.now()
    })
  )

  store.commit(
    events.messageCreated({
      id: 'msg-2',
      content: 'This is a test message',
      timestamp: Date.now() + 1000
    })
  )

  store.commit(
    events.userJoined({
      userId: 'user-2',
      username: 'Bob'
    })
  )

  console.log('\n📊 Querying results...')

  // Query and display messages with attribution
  const allMessages = store.query(messages)
  console.log('\n💬 Messages with attribution:')
  allMessages.forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleTimeString()
    console.log(`  [${date}] "${msg.content}" (created by: ${msg.createdBy})`)
  })

  // Query and display users with attribution
  const allUsers = store.query(users)
  console.log('\n👥 Users with attribution:')
  allUsers.forEach(user => {
    console.log(`  ${user.username} (joined via: ${user.joinedViaClient})`)
  })

  console.log('\n✅ Demo completed!')
  console.log('\n🎉 Key takeaways:')
  console.log('  • clientId is available in all materializers')
  console.log('  • You can store clientId for attribution and audit logging')
  console.log('  • This enables tracking who created what events')
  console.log('  • Perfect for collaborative applications and audit trails')
}

// Run the demo
runDemo().catch(console.error)
