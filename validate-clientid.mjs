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

// Track materializer calls for validation
const materializerCalls = []

// Define materializers with clientId access
const materializers = State.SQLite.materializers(events, {
  messageCreated: ({ id, content }, { clientId }) => {
    console.log(`✓ Materializer called with clientId: ${clientId}`)

    // Track the call for validation
    materializerCalls.push({ id, content, clientId })

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

// Validation function
async function validateClientIdInMaterializers() {
  console.log('🚀 Starting clientId validation...')

  try {
    const adapter = makeAdapter({ storage: { type: 'in-memory' } })

    const store = await createStore({
      schema,
      adapter,
      storeId: 'clientid-validation',
    })

    console.log(`📝 Store created with clientId: ${store.clientId}`)

    // Commit some messages
    console.log('📨 Committing messages...')
    store.commit(events.messageCreated({ id: '1', content: 'Hello from client!' }))
    store.commit(events.messageCreated({ id: '2', content: 'Another message' }))

    // Query messages to see the clientId attribution
    const allMessages = store.query(messages)
    console.log('💾 Messages stored:', allMessages)

    // Validate that materializers received clientId
    console.log('\n🔍 Validation Results:')

    if (materializerCalls.length === 0) {
      console.error('❌ No materializer calls recorded!')
      return false
    }

    let allValid = true

    for (const call of materializerCalls) {
      if (!call.clientId) {
        console.error(`❌ Materializer call missing clientId for message ${call.id}`)
        allValid = false
      } else {
        console.log(`✅ Message ${call.id}: clientId = ${call.clientId}`)
      }
    }

    // Validate that stored messages have correct clientId
    for (const msg of allMessages) {
      if (!msg.createdBy) {
        console.error(`❌ Message ${msg.id} missing createdBy field`)
        allValid = false
      } else if (msg.createdBy !== store.clientId) {
        console.error(`❌ Message ${msg.id} has incorrect createdBy: ${msg.createdBy}, expected: ${store.clientId}`)
        allValid = false
      } else {
        console.log(`✅ Message ${msg.id}: createdBy = ${msg.createdBy}`)
      }
    }

    if (allValid) {
      console.log('\n🎉 All validations passed! clientId is properly available in materializers.')
      return true
    } else {
      console.log('\n❌ Some validations failed.')
      return false
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error)
    return false
  }
}

// Run the validation
validateClientIdInMaterializers()
  .then(success => {
    if (success) {
      console.log('\n✅ clientId materializer feature working correctly!')
      process.exit(0)
    } else {
      console.log('\n❌ clientId materializer feature validation failed!')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  })
