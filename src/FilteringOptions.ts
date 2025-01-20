import type { TopicPattern, ContentFilteringFunction } from "./Subscription";

/**
 * Configuration options for filtering messages in a subscription.
 * @template Msg - The type of messages being filtered
 */
export type FilteringOptions<Msg> = {
  /**
   * Pattern to match against message topics.
   * Can be a string for exact match, a number for numeric comparison,
   * or a RegExp for pattern matching.
   */
  readonly topicPattern?: TopicPattern;

  /**
   * When true, messages without a topic will not be delivered when a topicPattern is set.
   * When false, messages without a topic will be delivered regardless of the topicPattern.
   */
  readonly strictTopicFiltering: boolean;

  /**
   * Optional function to filter messages based on their content.
   * When provided, only messages for which this function returns true will be delivered.
   */
  readonly contentFilter?: ContentFilteringFunction<Msg>;
};

/**
 * Properties used to create filtering options.
 * Makes all properties of FilteringOptions optional and mutable.
 * @template Msg - The type of messages being filtered
 */
export type FilteringCreationProps<Msg> = {
  -readonly [K in keyof FilteringOptions<Msg>]?: FilteringOptions<Msg>[K];
};

/**
 * Builds filtering options for a subscription from the provided properties.
 *
 * @template Msg - The type of messages being filtered
 * @param {TopicPattern | FilteringCreationProps<Msg>} [props] - Configuration properties
 * @returns {FilteringOptions<Msg>} The constructed filtering options
 *
 * Can be used in several ways:
 * - Without arguments for default options: buildFilteringOptions()
 * - With a topic pattern: buildFilteringOptions("my-topic")
 * - With a regex pattern: buildFilteringOptions(new RegExp("topic-.*"))
 * - With content filtering: buildFilteringOptions({ contentFilter: (msg) => msg.length > 0 })
 * - With combined options: buildFilteringOptions({
 *     topicPattern: "my-topic",
 *     contentFilter: (msg) => typeof msg === "string",
 *     strictTopicFiltering: false
 *   })
 */
export function buildFilteringOptions<Msg>(
  props?: TopicPattern | FilteringCreationProps<Msg>
): FilteringOptions<Msg> {
  // Case where no options were provided
  if (typeof props === "undefined") {
    return { strictTopicFiltering: false };
  }
  // Case where provided options is of TopicPattern type
  if (
    typeof props === "number" ||
    typeof props === "string" ||
    props instanceof RegExp
  ) {
    return {
      topicPattern: props,
      strictTopicFiltering: true,
    };
  }
  // Case where provided options are TopicFilteringCreationProps
  const tmp: {
    -readonly [K in keyof FilteringOptions<Msg>]: FilteringOptions<Msg>[K];
  } = { strictTopicFiltering: false };
  if ("topicPattern" in props) {
    tmp.topicPattern = props.topicPattern;
    tmp.strictTopicFiltering = props.strictTopicFiltering ?? true;
  }
  if ("contentFilter" in props) {
    tmp.contentFilter = props.contentFilter;
  }
  return tmp;
}
