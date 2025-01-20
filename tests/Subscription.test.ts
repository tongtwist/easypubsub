import { describe, test, expect, afterEach } from "bun:test";
import { Subscription } from "../src/Subscription";
import type { FilteringOptions } from "../src/FilteringOptions";

describe("Subscription", () => {
  afterEach(() => {
    // Clean up the static map after each test
    const subscriptions = Array.from(
      Subscription["uniqueSubscriptions"].keys()
    );
    subscriptions.forEach((key) => {
      Subscription.unref(key);
    });
  });

  describe("subscription management", () => {
    test("should generate incremental IDs for new subscriptions", () => {
      const consume = () => {};
      const sub1 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });
      const sub2 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: true,
      });
      const sub3 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });

      expect(sub2.key).toBe(sub1.key + 1);
      expect(sub3.key).toBe(sub2.key + 1);
    });

    test("should create new subscription with new ID after unref", () => {
      const consume = () => {};
      const sub1 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });
      const key1 = sub1.key;

      expect(Subscription.unref(key1)).toBe(true);
      expect(Subscription.unref(key1)).toBe(false);

      const sub2 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });
      expect(sub2.key).toBeGreaterThan(key1);
      expect(sub2).not.toBe(sub1);
    });

    test("should maintain unique IDs across multiple operations", () => {
      const consume = () => {};
      const sub1 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });
      const sub2 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: true,
      });

      Subscription.unref(sub1.key);

      const sub3 = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });
      expect(sub3.key).toBeGreaterThan(sub2.key);
    });

    test("should create new subscription with new ID even with same parameters", () => {
      const consume = () => {};
      const options: FilteringOptions<unknown> = {
        strictTopicFiltering: false,
      };
      const sub1 = Subscription.getOrCreate(consume, options);
      const sub2 = Subscription.getOrCreate(consume, options);

      expect(sub2.key).toBeGreaterThan(sub1.key);
      expect(sub2).not.toBe(sub1);
    });
  });

  describe("without filtering", () => {
    test("should accept any message when no filtering is defined", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });

      expect(subscription.check("any message")).toBe(true);
      expect(subscription.check({ data: "object message" })).toBe(true);
      expect(subscription.check(42)).toBe(true);
    });

    test("should accept messages with or without topic when no filtering is defined", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
      });

      expect(subscription.check("message", "topic")).toBe(true);
      expect(subscription.check("message")).toBe(true);
    });
  });

  describe("with topic filtering", () => {
    test("should accept messages with exact matching topic", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        topicPattern: "specific-topic",
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", "specific-topic")).toBe(true);
      expect(subscription.check("message", "other-topic")).toBe(false);
    });

    test("should accept messages with topic matching regexp", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        topicPattern: new RegExp("^test-\\d+$"),
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", "test-123")).toBe(true);
      expect(subscription.check("message", "test-abc")).toBe(false);
    });

    test("should handle number topics", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        topicPattern: 42,
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", 42)).toBe(true);
      expect(subscription.check("message", 24)).toBe(false);
    });

    test("should handle regexp with number topics", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        topicPattern: new RegExp("^4\\d$"),
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", 42)).toBe(true);
      expect(subscription.check("message", 52)).toBe(false);
    });

    describe("with strict topic filtering", () => {
      test("should reject messages without topic", () => {
        const consume = () => {};
        const subscription = Subscription.getOrCreate(consume, {
          topicPattern: "topic",
          strictTopicFiltering: true,
        });

        expect(subscription.check("message")).toBe(false);
      });
    });

    describe("without strict topic filtering", () => {
      test("should accept messages without topic", () => {
        const consume = () => {};
        const subscription = Subscription.getOrCreate(consume, {
          topicPattern: "topic",
          strictTopicFiltering: false,
        });

        expect(subscription.check("message")).toBe(true);
      });
    });
  });

  describe("with content filtering", () => {
    test("should accept messages matching content filter", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        strictTopicFiltering: false,
        contentFilter: (msg: unknown) => typeof msg === "string",
      });

      expect(subscription.check("string message")).toBe(true);
      expect(subscription.check({ data: "object message" })).toBe(false);
    });

    test("should combine content and topic filtering", () => {
      const consume = () => {};
      const subscription = Subscription.getOrCreate(consume, {
        topicPattern: "topic",
        strictTopicFiltering: true,
        contentFilter: (msg: unknown) => typeof msg === "string",
      });

      expect(subscription.check("string message", "topic")).toBe(true);
      expect(subscription.check("string message", "other-topic")).toBe(false);
      expect(subscription.check({ data: "object message" }, "topic")).toBe(
        false
      );
    });
  });

  describe("with typed messages", () => {
    interface TestMessage {
      type: string;
      data: unknown;
    }

    test("should handle typed messages with content filtering", () => {
      const consume = (msg: TestMessage) => {};
      const subscription = Subscription.getOrCreate<TestMessage>(consume, {
        strictTopicFiltering: false,
        contentFilter: (msg: TestMessage) => msg.type === "test",
      });

      expect(subscription.check({ type: "test", data: "value" })).toBe(true);
      expect(subscription.check({ type: "other", data: "value" })).toBe(false);
    });

    test("should handle typed messages with topic filtering", () => {
      const consume = (msg: TestMessage) => {};
      const subscription = Subscription.getOrCreate<TestMessage>(consume, {
        topicPattern: "test-topic",
        strictTopicFiltering: true,
      });

      expect(
        subscription.check({ type: "any", data: "value" }, "test-topic")
      ).toBe(true);
      expect(
        subscription.check({ type: "any", data: "value" }, "other-topic")
      ).toBe(false);
    });
  });
});
