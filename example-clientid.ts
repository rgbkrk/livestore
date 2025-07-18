import { makeAdapter } from '@livestore/adapter-node'
import { Events, makeSchema, State } from '@livestore/common/schema'
import { createStore } from '@livestore/livestore'
import { Schema } from '@livestore/utils/effect'

// Define events
const events = {
  messageCreated: Events.synced({
    name: 'messageCreated',
    schema: Schema.Struct({
      id: Schema.String,
      content: Schema.String,
    }),
  }),
}

// Define tables
const messages = State.SQLite.table({
  name: 'messages',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    content: State.SQLite.text(),
    createdBy: State.SQLite.text(), // This will store the clientId
  },
})

const tables = { messages }

// Define materializers with clientId access
const materializers = State.SQLite.materializers(events, {
  messageCreated: ({ id, content }, { clientId }) => {
    console.log(`Message "${content}" created by client: ${clientId}`)

    // Insert the message with the clientId as createdBy
    return messages.insert({
      id,
      content,
      createdBy: clientId,
    })
  },
})

// Create schema
const schema = makeSchema({
  events,
  state: State.SQLite.makeState({ tables, materializers }),
})

// Example usage
async function example() {
  const adapter = makeAdapter({ storage: { type: 'in-memory' } })

  const store = await createStore({
    schema,
    adapter,
    storeId: 'clientid-example',
  })

  // Commit some messages
  store.commit(events.messageCreated({ id: '1', content: 'Hello from client!' }))
  store.commit(events.messageCreated({ id: '2', content: 'Another message' }))

  // Query messages to see the clientId attribution
  const allMessages = store.query(messages)
  console.log('Messages with attribution:', allMessages)

  // You can now see which client created each message
  allMessages.forEach(msg => {
    console.log(`Message "${msg.content}" was created by client: ${msg.createdBy}`)
  })
}

// Run the example
example().catch(console.error)
