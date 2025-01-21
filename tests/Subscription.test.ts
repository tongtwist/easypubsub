import { describe, test, expect } from "bun:test";
import { Subscription } from "../src/Subscription";
import type { FilteringOptions } from "../src/FilteringOptions";

describe("Subscription", () => {
  describe("without filtering", () => {
    test("should accept any message when no filtering is defined", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
        strictTopicFiltering: false,
      });

      expect(subscription.check("any message")).toBe(true);
      expect(subscription.check({ data: "object message" })).toBe(true);
      expect(subscription.check(42)).toBe(true);
    });

    test("should accept messages with or without topic when no filtering is defined", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
        strictTopicFiltering: false,
      });

      expect(subscription.check("message", "topic")).toBe(true);
      expect(subscription.check("message")).toBe(true);
    });
  });

  describe("with topic filtering", () => {
    test("should accept messages with exact matching topic", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
        topicPattern: "specific-topic",
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", "specific-topic")).toBe(true);
      expect(subscription.check("message", "other-topic")).toBe(false);
    });

    test("should accept messages with topic matching regexp", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
        topicPattern: new RegExp("^test-\\d+$"),
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", "test-123")).toBe(true);
      expect(subscription.check("message", "test-abc")).toBe(false);
    });

    test("should handle number topics", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
        topicPattern: 42,
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", 42)).toBe(true);
      expect(subscription.check("message", 24)).toBe(false);
    });

    test("should handle regexp with number topics", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
        topicPattern: new RegExp("^4\\d$"),
        strictTopicFiltering: true,
      });

      expect(subscription.check("message", 42)).toBe(true);
      expect(subscription.check("message", 52)).toBe(false);
    });

    describe("with strict topic filtering", () => {
      test("should reject messages without topic", () => {
        const consume = () => {};
        const subscription = Subscription.create(consume, {
          topicPattern: "topic",
          strictTopicFiltering: true,
        });

        expect(subscription.check("message")).toBe(false);
      });
    });

    describe("without strict topic filtering", () => {
      test("should accept messages without topic", () => {
        const consume = () => {};
        const subscription = Subscription.create(consume, {
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
      const subscription = Subscription.create(consume, {
        strictTopicFiltering: false,
        contentFilter: (msg: unknown) => typeof msg === "string",
      });

      expect(subscription.check("string message")).toBe(true);
      expect(subscription.check({ data: "object message" })).toBe(false);
    });

    test("should combine content and topic filtering", () => {
      const consume = () => {};
      const subscription = Subscription.create(consume, {
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
      const subscription = Subscription.create<TestMessage>(consume, {
        strictTopicFiltering: false,
        contentFilter: (msg: TestMessage) => msg.type === "test",
      });

      expect(subscription.check({ type: "test", data: "value" })).toBe(true);
      expect(subscription.check({ type: "other", data: "value" })).toBe(false);
    });

    test("should handle typed messages with topic filtering", () => {
      const consume = (msg: TestMessage) => {};
      const subscription = Subscription.create<TestMessage>(consume, {
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
