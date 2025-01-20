import type { FilteringOptions } from "./FilteringOptions";

/**
 * Represents a message topic. It can be either a string or a number.
 * @typedef {(string|number)} Topic
 */
export type Topic = string | number;

/**
 * Pattern used to filter topics.
 * Can be either an exact topic value (Topic) or a regular expression (RegExp).
 * If the pattern is a RegExp and the topic is a number, the topic is converted
 * to a string to allow matching with the regular expression.
 * @example
 * // Using exact topic
 * const pattern1: TopicPattern = "my-topic";
 * const pattern2: TopicPattern = 42;
 *
 * // Using RegExp
 * const pattern3: TopicPattern = new RegExp("topic-.*");
 *
 * @typedef {(Topic|RegExp)} TopicPattern
 */
export type TopicPattern = Topic | RegExp;

/**
 * Consumer function called when a message passes the filters.
 * @template Msg - Type of message to consume
 * @callback ConsumeFunction
 * @param {Msg} msg - The message data to consume
 * @returns {MaybePromise<void>} Void or a Promise<void>
 */
export type ConsumeFunction<Msg = unknown> = (msg: Msg) => MaybePromise<void>;

/**
 * Function for filtering message content.
 * Allows filtering messages in addition to topic filtering.
 * @template Msg - Type of message to filter
 * @callback ContentFilteringFunction
 * @param {Msg} msg - The message data to filter
 * @returns {boolean} true if the message should be kept, false otherwise
 */
export type ContentFilteringFunction<Msg = unknown> = (msg: Msg) => boolean;

/**
 * Utility type representing either a value T or a Promise of T.
 * @template T - Type of the value
 * @typedef {(T|Promise<T>)} MaybePromise
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Numeric type representing a unique key for subscription identification.
 * Each subscription gets a unique incremental ID generated from lastId counter.
 * This key is used to track and manage unique subscriptions across the application.
 * @typedef {number} UniqueSubscriptionKey
 */
export type UniqueSubscriptionKey = number;

/**
 * Class representing a subscription to messages.
 * Handles the checks used in message filtering by topic and/or content.
 * @template Msg - Type of messages handled by the subscription
 */
export class Subscription<Msg = unknown> {
  /**
   * Static map storing unique subscriptions to prevent duplicates.
   * The key is a unique incremental ID, and the value is the subscription instance.
   * @private
   * @static
   * @type {Map<UniqueSubscriptionKey, Subscription<any>>}
   */
  private static readonly uniqueSubscriptions: Map<
    UniqueSubscriptionKey,
    Subscription<any>
  > = new Map();

  /**
   * Counter used to generate unique subscription IDs.
   * Incremented each time a new subscription is created.
   * @private
   * @static
   * @type {UniqueSubscriptionKey}
   */
  private static lastId: UniqueSubscriptionKey = -1;

  /**
   * Matching function for topic filtering.
   * @private
   * @type {((givenTopic: Topic) => boolean) | undefined}
   */
  private topicMatcher?: (givenTopic: Topic) => boolean;

  /**
   * Creates a new subscription with the specified filtering options.
   * @private
   * @param {UniqueSubscriptionKey} _key - Unique identifier for this subscription
   * @param {ConsumeFunction<Msg>} consume - Function called to consume filtered messages
   * @param {boolean} strictTopicFiltering - Controls how messages without topics are handled:
   *   - When true and topicPattern is set: messages without topic are rejected
   *   - When false: messages without topic are accepted regardless of topicPattern
   * @param {TopicPattern} [topicPattern] - Optional pattern to match against message topics
   * @param {ContentFilteringFunction<Msg>} [contentFilter] - Optional function to filter messages by content
   */
  private constructor(
    private readonly _key: UniqueSubscriptionKey,
    public readonly consume: ConsumeFunction<Msg>,
    public readonly strictTopicFiltering: boolean,
    public readonly topicPattern?: TopicPattern,
    public readonly contentFilter?: ContentFilteringFunction<Msg>
  ) {
    if (typeof topicPattern !== "undefined") {
      this.topicMatcher =
        typeof topicPattern === "string" || typeof topicPattern === "number"
          ? (givenTopic: Topic) => givenTopic === topicPattern!
          : (givenTopic: Topic) =>
              givenTopic.toString().match(topicPattern) !== null;
    }
  }

  /**
   * Gets the unique numeric ID identifying this subscription.
   * This ID is used internally to track and manage unique subscriptions,
   * and can be used with the unref method to remove the subscription from the static map.
   * @returns {UniqueSubscriptionKey} The unique numeric ID for this subscription
   */
  get key(): UniqueSubscriptionKey {
    return this._key;
  }

  /**
   * Checks if a message matches the subscription's filtering criteria.
   * @param {Msg} msg - The message to filter
   * @param {Topic} [topic] - The optional topic associated with the message
   * @returns {boolean} true if the message passes the filters, false otherwise
   */
  check(msg: Msg, topic?: Topic): boolean {
    return (
      this.matchTopic(topic) && (!this.contentFilter || this.contentFilter(msg))
    );
  }

  /**
   * Checks if a topic matches the filtering pattern.
   * @private
   * @param {Topic} [topic] - The topic to check
   * @returns {boolean} true if the topic matches the pattern or if no pattern is defined
   */
  private matchTopic(topic?: Topic): boolean {
    if (typeof this.topicPattern === "undefined") {
      return true;
    }
    if (typeof topic === "undefined") {
      return !this.strictTopicFiltering;
    }
    return !this.topicMatcher || this.topicMatcher(topic);
  }

  /**
   * Gets an existing subscription matching the parameters or creates a new one.
   * This method ensures that identical subscriptions are reused rather than duplicated.
   * @template Msg - Type of messages handled by the subscription
   * @static
   * @param {ConsumeFunction<Msg>} consume - Function called to consume filtered messages
   * @param {FilteringOptions<Msg>} opts - Options for filtering messages:
   *   - topicPattern: Optional pattern to match against message topics
   *   - strictTopicFiltering: Controls how messages without topics are handled
   *   - contentFilter: Optional function to filter messages based on their content
   * @returns {Subscription<Msg>} An existing or new subscription instance
   * @see FilteringOptions for detailed options documentation
   */
  static getOrCreate<Msg = unknown>(
    consume: ConsumeFunction<Msg>,
    opts: FilteringOptions<Msg>
  ): Subscription<Msg> {
    const key = ++Subscription.lastId;
    if (Subscription.uniqueSubscriptions.has(key)) {
      return Subscription.uniqueSubscriptions.get(key)!;
    }
    const subscription = new Subscription<Msg>(
      key,
      consume,
      opts.strictTopicFiltering,
      opts.topicPattern,
      opts.contentFilter
    );
    Subscription.uniqueSubscriptions.set(key, subscription);
    return subscription;
  }

  /**
   * Removes a subscription reference from the static map.
   * @template Msg - Type of messages handled by the subscription
   * @static
   * @param {UniqueSubscriptionKey} key - The unique key identifying the subscription to remove
   * @returns {boolean} true if a subscription was removed, false if it didn't exist
   */
  static unref(key: UniqueSubscriptionKey): boolean {
    const existed = Subscription.uniqueSubscriptions.has(key);
    if (existed) {
      Subscription.uniqueSubscriptions.delete(key);
    }
    return existed;
  }
}
