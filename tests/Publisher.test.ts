import { describe, test, expect, mock } from "bun:test";
import { Publisher } from "../src/Publisher";
import type { ConsumeFunction } from "../src/Subscription";

describe("Publisher", () => {
  describe("creation", () => {
    test("should create a new publisher instance", () => {
      const publisher = Publisher.create();
      expect(publisher).toBeInstanceOf(Publisher);
      expect(publisher.subscriptionsNumber).toBe(0);
    });
  });

  describe("subscription management", () => {
    test("should add new subscription", () => {
      const publisher = Publisher.create();
      const consume = () => {};

      const unsubscribe = publisher.subscribe(consume);
      expect(publisher.subscriptionsNumber).toBe(1);
      expect(typeof unsubscribe).toBe("function");
    });

    test("should remove subscription on unsubscribe", () => {
      const publisher = Publisher.create();
      const consume = () => {};

      const unsubscribe = publisher.subscribe(consume);
      expect(publisher.subscriptionsNumber).toBe(1);

      unsubscribe();
      expect(publisher.subscriptionsNumber).toBe(0);
    });
  });

  describe("message emission", () => {
    test("should emit message to all matching subscribers", () => {
      const publisher = Publisher.create<string>();
      const consume1 = mock((msg: string) => {
        console.log(`consume1("${msg}")...`);
      });
      const consume2 = mock((msg: string) => {
        console.log(`consume2("${msg}")...`);
      });

      publisher.subscribe(consume1);
      publisher.subscribe(consume2);

      publisher.getEmitter()("test message");

      expect(consume1).toHaveBeenCalledTimes(1);
      expect(consume1).toHaveBeenCalledWith("test message");
      expect(consume2).toHaveBeenCalledTimes(1);
      expect(consume2).toHaveBeenCalledWith("test message");
    });

    test("should emit message only to subscribers with matching topic", () => {
      const publisher = Publisher.create<string>();
      const consume1 = mock((msg: string) => {});
      const consume2 = mock((msg: string) => {});

      publisher.subscribe(consume1, "topic1");
      publisher.subscribe(consume2, "topic2");

      publisher.getEmitter()("test message", "topic1");

      expect(consume1).toHaveBeenCalledTimes(1);
      expect(consume2).toHaveBeenCalledTimes(0);
    });

    test("should emit message only to subscribers with matching content filter", () => {
      const publisher = Publisher.create<unknown>();
      const consume1 = mock((msg: unknown) => {});
      const consume2 = mock((msg: unknown) => {});

      publisher.subscribe(
        consume1,
        undefined,
        (msg) => typeof msg === "string"
      );
      publisher.subscribe(
        consume2,
        undefined,
        (msg) => typeof msg === "number"
      );

      const emit = publisher.getEmitter();
      emit("test message");
      emit(42);

      expect(consume1).toHaveBeenCalledTimes(1);
      expect(consume1).toHaveBeenCalledWith("test message");
      expect(consume2).toHaveBeenCalledTimes(1);
      expect(consume2).toHaveBeenCalledWith(42);
    });
  });

  describe("emitter function", () => {
    test("should get emitter function that emits messages", () => {
      const publisher = Publisher.create<string>();
      const consume = mock((msg: string) => {});

      publisher.subscribe(consume);
      const emit = publisher.getEmitter();

      emit("test message");

      expect(consume).toHaveBeenCalledTimes(1);
      expect(consume).toHaveBeenCalledWith("test message");
    });

    test("should get emitter function that respects topic filtering", () => {
      const publisher = Publisher.create<string>();
      const consume = mock((msg: string) => {});

      publisher.subscribe(consume, "topic");
      const emit = publisher.getEmitter();

      emit("test message", "other-topic");
      expect(consume).toHaveBeenCalledTimes(0);

      emit("test message", "topic");
      expect(consume).toHaveBeenCalledTimes(1);
      expect(consume).toHaveBeenCalledWith("test message");
    });
  });

  describe("async message handling", () => {
    test("should wait for all async consumers to complete", async () => {
      const publisher = Publisher.create<string>();
      let counter = 0;

      const asyncConsume1: ConsumeFunction<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        counter++;
      };

      const asyncConsume2: ConsumeFunction<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        counter++;
      };

      publisher.subscribe(asyncConsume1);
      publisher.subscribe(asyncConsume2);

      await publisher.getEmitter()("test message");
      expect(counter).toBe(2);
    });

    test("should handle mix of sync and async consumers", async () => {
      const publisher = Publisher.create<string>();
      let syncCalled = false;
      let asyncCalled = false;

      const syncConsume = () => {
        syncCalled = true;
      };

      const asyncConsume: ConsumeFunction<string> = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        asyncCalled = true;
      };

      publisher.subscribe(syncConsume);
      publisher.subscribe(asyncConsume);

      await publisher.getEmitter()("test message");
      expect(syncCalled).toBe(true);
      expect(asyncCalled).toBe(true);
    });
  });

  describe("typed messages", () => {
    interface TestMessage {
      type: string;
      data: unknown;
    }

    test("should handle typed messages with type checking", () => {
      const publisher = Publisher.create<TestMessage>();
      const consume = mock((msg: TestMessage) => {});

      publisher.subscribe(consume);

      const message: TestMessage = { type: "test", data: "value" };
      publisher.getEmitter()(message);

      expect(consume).toHaveBeenCalledTimes(1);
      expect(consume).toHaveBeenCalledWith(message);
    });

    test("should handle typed messages with content filtering", () => {
      const publisher = Publisher.create<TestMessage>();
      const consume = mock((msg: TestMessage) => {});

      publisher.subscribe(
        consume,
        undefined,
        (msg) => msg.type === "specific-type"
      );

      const emit = publisher.getEmitter();
      emit({ type: "other-type", data: "value" });
      expect(consume).toHaveBeenCalledTimes(0);

      emit({ type: "specific-type", data: "value" });
      expect(consume).toHaveBeenCalledTimes(1);
    });
  });
});
