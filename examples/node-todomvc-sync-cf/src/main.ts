import process from "node:process";

import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";

import { events, schema, tables } from "./livestore/schema.ts";

const main = async () => {
  const adapter = makeAdapter({
    storage: { type: "in-memory" },
    // Comment out sync for local demo
    // sync: {
    //   backend: makeCfSync({ url: "ws://localhost:8787" }),
    //   onSyncError: "shutdown",
    // },
  });

  const store = await createStorePromise({
    adapter,
    schema,
    storeId: process.env.STORE_ID ?? "test",
    // Comment out sync payload for local demo
    // syncPayload: { authToken: "insecure-token-change-me" },
  });

  console.log(`🆔 Store clientId: ${store.clientId}`);
  console.log(`📋 Session ID: ${store.sessionId}`);
  console.log("");

  // Create some todos to demonstrate clientId attribution
  console.log("📝 Creating todos...");
  store.commit(
    events.todoCreated({
      id: crypto.randomUUID(),
      text: "Task created from node-adapter",
    }),
  );
  store.commit(
    events.todoCreated({
      id: crypto.randomUUID(),
      text: "Another task with attribution",
    }),
  );
  store.commit(
    events.todoCreated({
      id: crypto.randomUUID(),
      text: "Third task for demo",
    }),
  );

  const todos = store.query(tables.todos);

  console.log("\n📊 All todos with attribution:");
  todos.forEach((todo, index) => {
    console.log(
      `  ${index + 1}. "${todo.text}" (created by: ${todo.createdBy})`,
    );
  });

  console.log("\n✅ clientId attribution demo completed!");

  // No need to wait for sync in in-memory mode
  await store.shutdown();
};

main().catch(console.error);
