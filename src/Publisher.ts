import {
  type Topic,
  type TopicPattern,
  type ConsumeFunction,
  type ContentFilteringFunction,
  type MaybePromise,
  Subscription,
} from "./Subscription";

/**
 * Function to cancel a subscription.
 * @callback Unsubscribe
 * @returns {void}
 */
export type Unsubscribe = () => void;

/**
 * Function type for emitting messages to subscribers.
 * @template Msg - Type of messages that can be emitted
 * @param {Msg} msg - The message to emit
 * @param {Topic} [topic] - Optional topic associated with the message
 * @returns {MaybePromise<void>} Promise that resolves when all subscribers have processed the message
 */
export type Emitter<Msg> = (msg: Msg, topic?: Topic) => MaybePromise<void>;

/**
 * Class managing message subscriptions.
 * Provides functionality for subscribing to messages and emitting messages to subscribers.
 * @template Msg - Type of messages handled by the publisher
 */
export class Publisher<Msg> {
  /**
   * Map storing active subscriptions and their unsubscribe functions.
   * @private
   * @type {Map<Subscription<Msg>, Unsubscribe>}
   */
  private readonly subscriptions: Map<Subscription<Msg>, Unsubscribe>;

  /**
   * Private constructor to enforce factory pattern creation through create() method.
   * @private
   */
  private constructor() {
    this.subscriptions = new Map<Subscription<Msg>, Unsubscribe>();
  }

  /**
   * Gets the current number of active subscriptions.
   * @returns {number} The number of active subscriptions
   */
  get subscriptionsNumber(): number {
    return this.subscriptions.size;
  }

  /**
   * Returns a function that can be used to emit messages to subscribers.
   * Useful when you want to pass emission capability without exposing the entire publisher.
   * @returns {Emitter<Msg>} A function that can emit messages to subscribers
   */
  getEmitter(): Emitter<Msg> {
    return (msg: Msg, topic?: Topic): MaybePromise<void> => {
      const consumptionFunctionsToWait = this.subscriptions
        .keys()
        .reduce(
          (acc: Promise<void>[], sub: Subscription<Msg>): Promise<void>[] => {
            if (sub.check(msg, topic)) {
              const consumptionRet = sub.consume(msg);
              if (typeof consumptionRet !== "undefined") {
                return acc.concat([consumptionRet]);
              }
            }
            return acc;
          },
          []
        );
      if (consumptionFunctionsToWait.length > 0) {
        return Promise.all(consumptionFunctionsToWait).then(() => {});
      }
    };
  }

  /**
   * Registers a new subscription with optional filtering criteria.
   * @param {ConsumeFunction<Msg>} consume - Function to handle matching messages
   * @param {TopicPattern} [topicPattern] - Optional pattern to filter messages by topic
   * @param {ContentFilteringFunction<Msg>} [contentFilter] - Optional function to filter messages by content
   * @param {boolean} [strictTopicPatternFiltering=true] - If true, messages without topic will be rejected when a topicPattern is defined
   * @returns {Unsubscribe} Function to cancel the subscription
   */
  subscribe(
    consume: ConsumeFunction<Msg>,
    topicPattern?: TopicPattern,
    contentFilter?: ContentFilteringFunction<Msg>,
    strictTopicPatternFiltering: boolean = true
  ): Unsubscribe {
    const subscription: Subscription<Msg> = new Subscription(
      consume,
      strictTopicPatternFiltering,
      topicPattern,
      contentFilter
    );
    if (this.subscriptions.has(subscription)) {
      return this.subscriptions.get(subscription)!;
    }
    const unsubscribe = () => this.subscriptions.delete(subscription);
    this.subscriptions.set(subscription, unsubscribe);
    return unsubscribe;
  }

  /**
   * Creates a new Publisher instance.
   * @template Msg - Type of messages to be handled by the publisher
   * @returns {Publisher<Msg>} A new Publisher instance
   * @static
   */
  static create<Msg>(): Publisher<Msg> {
    return new Publisher<Msg>();
  }
}
