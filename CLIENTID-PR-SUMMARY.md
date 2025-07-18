# Add clientId to Materializer Context

## Summary

This PR adds the `clientId` parameter to the materializer context, enabling materializers to access the client ID that created each event. This is essential for proper attribution and audit logging in the event store.

## Changes Made

### 1. Updated Materializer Type Definition
- **File**: `packages/@livestore/common/src/schema/EventDef.ts`
- **Change**: Added `clientId: string` to the materializer context type
- **Impact**: Materializers now receive the client ID that created the event

### 2. Updated Materializer Helper Functions
- **File**: `packages/@livestore/common/src/materializer-helper.ts`
- **Changes**:
  - Added `clientId` parameter to `getExecStatementsFromMaterializer`
  - Pass `clientId` to materializer function calls
  - Updated `makeMaterializerHash` to include client ID

### 3. Updated Leader Thread Materialization
- **File**: `packages/@livestore/common/src/leader-thread/materialize-event.ts`
- **Change**: Pass `eventEncoded.clientId` to `getExecStatementsFromMaterializer`
- **Impact**: Leader thread now provides client ID during event materialization

### 4. Updated Store Materialization
- **File**: `packages/@livestore/livestore/src/store/store.ts`
- **Change**: Pass `eventDecoded.clientId` to `getExecStatementsFromMaterializer`
- **Impact**: Client sessions now provide client ID during event materialization

## Usage Example

```typescript
const materializers = State.SQLite.materializers(events, {
  messageCreated: ({ id, content }, { clientId }) => {
    console.log(`Message created by client: ${clientId}`)
    
    // Store the client ID for attribution
    return messages.insert({
      id,
      content,
      createdBy: clientId, // Now available!
    })
  },
})
```

## Benefits

1. **Attribution**: Track which client created each event
2. **Audit Logging**: Build comprehensive audit trails
3. **Authorization**: Implement client-specific permissions
4. **Analytics**: Analyze usage patterns by client
5. **Debugging**: Better debugging with client context

## Backward Compatibility

- ✅ **Fully backward compatible**
- ✅ Existing materializers continue to work unchanged
- ✅ `clientId` is an optional parameter that can be destructured when needed
- ✅ No breaking changes to existing APIs

## Testing

- ✅ All existing tests continue to pass
- ✅ Type checking validates the new parameter
- ✅ Example demonstrates practical usage
- ✅ Validation script confirms functionality

## Files Added

- `example-clientid.ts` - Demonstrates usage of clientId in materializers
- `validate-clientid.mjs` - Validation script to test the feature
- `CLIENTID-PR-SUMMARY.md` - This documentation

## Use Cases

This feature addresses the Discord discussion where users wanted to:
- Verify event authenticity by checking the client ID
- Build audit logs that track who created what
- Implement proper attribution in collaborative applications
- Enable more sophisticated authorization patterns

The `clientId` is now available alongside `currentFacts`, `eventDef`, and `query` in the materializer context, making it easy to build attribution-aware materializers.