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
 * When called, removes the subscription from the publisher's subscriptions map
 * and removes its reference from the Subscription's static map.
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
 * Each subscription is assigned a unique numeric ID for tracking and management.
 * @template Msg - Type of messages handled by the publisher
 */
export class Publisher<Msg> {
  /**
   * Map storing active subscriptions and their unsubscribe functions.
   * Each subscription has a unique numeric ID generated by the Subscription class.
   * The map uses the Subscription instance as key and stores its associated unsubscribe function.
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
   * Each subscription has its own unique numeric ID, so this represents
   * the total number of active subscriptions in this publisher.
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
   * Creates a new subscription with a unique numeric ID and stores it in the subscriptions map.
   * @param {ConsumeFunction<Msg>} consume - Function to handle matching messages
   * @param {TopicPattern} [topicPattern] - Optional pattern to filter messages by topic
   * @param {ContentFilteringFunction<Msg>} [contentFilter] - Optional function to filter messages by content
   * @param {boolean} [strictTopicPatternFiltering=true] - If true, messages without topic will be rejected when a topicPattern is defined
   * @returns {Unsubscribe} Function to cancel the subscription. When called, it will remove the subscription
   * from both the publisher's map and the Subscription's static map.
   */
  subscribe(
    consume: ConsumeFunction<Msg>,
    topicPattern?: TopicPattern,
    contentFilter?: ContentFilteringFunction<Msg>,
    strictTopicPatternFiltering: boolean = true
  ): Unsubscribe {
    const subscription = Subscription.getOrCreate(
      consume,
      strictTopicPatternFiltering,
      topicPattern,
      contentFilter
    );
    if (this.subscriptions.has(subscription)) {
      return this.subscriptions.get(subscription)!;
    }
    const unsubscribe = () => {
      Subscription.unref(subscription.key);
      this.subscriptions.delete(subscription);
    };
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
