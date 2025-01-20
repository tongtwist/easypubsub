import { describe, test, expect } from "bun:test";
import { buildFilteringOptions } from "../src/FilteringOptions";

describe("FilteringOptions", () => {
  describe("buildFilteringOptions", () => {
    test("should create default options when no parameters provided", () => {
      const options = buildFilteringOptions();
      expect(options).toEqual({
        strictTopicFiltering: false,
      });
    });

    describe("with TopicPattern", () => {
      test("should create options with string topic pattern", () => {
        const options = buildFilteringOptions("test-topic");
        expect(options).toEqual({
          topicPattern: "test-topic",
          strictTopicFiltering: true,
        });
      });

      test("should create options with number topic pattern", () => {
        const options = buildFilteringOptions(42);
        expect(options).toEqual({
          topicPattern: 42,
          strictTopicFiltering: true,
        });
      });

      test("should create options with RegExp topic pattern", () => {
        const pattern = /test-.*/;
        const options = buildFilteringOptions(pattern);
        expect(options).toEqual({
          topicPattern: pattern,
          strictTopicFiltering: true,
        });
      });
    });

    describe("with FilteringCreationProps", () => {
      test("should create options with topic pattern only", () => {
        const options = buildFilteringOptions({
          topicPattern: "test-topic",
        });
        expect(options).toEqual({
          topicPattern: "test-topic",
          strictTopicFiltering: true,
        });
      });

      test("should create options with content filter only", () => {
        const contentFilter = (msg: string) => msg.length > 5;
        const options = buildFilteringOptions({
          contentFilter,
        });
        expect(options).toEqual({
          strictTopicFiltering: false,
          contentFilter,
        });
      });

      test("should create options with topic pattern and strict filtering disabled", () => {
        const options = buildFilteringOptions({
          topicPattern: "test-topic",
          strictTopicFiltering: false,
        });
        expect(options).toEqual({
          topicPattern: "test-topic",
          strictTopicFiltering: false,
        });
      });

      test("should create options with all properties", () => {
        const contentFilter = (msg: string) => msg.length > 5;
        const options = buildFilteringOptions({
          topicPattern: "test-topic",
          strictTopicFiltering: false,
          contentFilter,
        });
        expect(options).toEqual({
          topicPattern: "test-topic",
          strictTopicFiltering: false,
          contentFilter,
        });
      });
    });
  });
});
