import { Events, makeSchema, Schema, State } from '@livestore/common/schema'

// Define a simple event
const events = {
  messageCreated: Events.synced({
    name: 'messageCreated',
    schema: Schema.Struct({
      id: Schema.String,
      content: Schema.String,
    }),
  }),
}

// Define a table that stores the clientId for attribution
const messages = State.SQLite.table({
  name: 'messages',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    content: State.SQLite.text(),
    createdBy: State.SQLite.text(), // Store the clientId here
  },
})

// Define materializer with clientId access
const materializers = State.SQLite.materializers(events, {
  messageCreated: ({ id, content }, { clientId }) => {
    // clientId is now available in the materializer context!
    console.log(`Message created by client: ${clientId}`)

    return messages.insert({
      id,
      content,
      createdBy: clientId, // Store for attribution
    })
  },
})

// Create schema
const schema = makeSchema({
  events,
  state: State.SQLite.makeState({ tables: { messages }, materializers }),
})

export { schema, events, messages }
