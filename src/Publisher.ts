import {
  type Topic,
  type ConsumeFunction,
  type MaybePromise,
  Subscription,
} from "./Subscription";
import {
  type FilteringCreationProps,
  buildFilteringOptions,
} from "./FilteringOptions";

/**
 * Function to cancel a subscription.
 * When called, removes the subscription from the publisher's subscriptions map.
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
   * Gets the current number of active subscriptions in this Publisher.
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
   * Registers a new subscription with optional filtering options.
   *
   * @param {ConsumeFunction<Msg>} consume - Function to handle matching messages
   * @param {FilteringCreationProps<Msg>} [filteringOptions] - Optional filtering configuration:
   *   - topicPattern: Pattern to match against message topics (string, number, or RegExp)
   *   - strictTopicFiltering: Controls how messages without topics are handled
   *   - contentFilter: Function to filter messages based on their content
   * @returns {Unsubscribe} Function to cancel the subscription
   *
   * @example
   * // Subscribe without filtering
   * publisher.subscribe(msg => console.log(msg));
   *
   * @example
   * // Subscribe with topic filtering
   * publisher.subscribe(msg => console.log(msg), {
   *   topicPattern: "my-topic",
   *   strictTopicFiltering: true
   * });
   *
   * @example
   * // Subscribe with content filtering
   * publisher.subscribe(msg => console.log(msg), {
   *   contentFilter: msg => typeof msg === "string"
   * });
   *
   * @example
   * // Subscribe with combined filtering
   * publisher.subscribe(msg => console.log(msg), {
   *   topicPattern: new RegExp("topic-.*"),
   *   contentFilter: msg => msg.length > 0,
   *   strictTopicFiltering: false
   * });
   *
   * @see FilteringOptions for detailed filtering options documentation
   */
  subscribe(
    consume: ConsumeFunction<Msg>,
    filteringOptions?: FilteringCreationProps<Msg>
  ): Unsubscribe {
    const opts = buildFilteringOptions<Msg>(filteringOptions);
    const subscription = Subscription.create(consume, opts);
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
