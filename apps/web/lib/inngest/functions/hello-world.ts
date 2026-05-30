import { inngest } from "@/lib/inngest/client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "growthos/hello.world" },
  async ({ event }) => {
    return { message: `Hello ${event.data.email ?? "world"}` };
  },
);
