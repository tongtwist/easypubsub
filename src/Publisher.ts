import {
  type ISubscription,
  type TopicPattern,
  type ConsumeFunction,
  type ContentFilterFunction,
  type MaybePromise,
  Subscription,
} from "./Subscription";

export interface IPublisher<Msg> {
  subscribe(
    consume: ConsumeFunction<Msg>,
    topic?: TopicPattern,
    contentFilter?: ContentFilterFunction<Msg>,
    strictTopicPatternFiltering?: boolean
  ): Unsubscribe;
  readonly subscriptionsNumber: number;
}

export type Unsubscribe = () => void;

export interface IEmitter<Msg> {
  emit(message: Msg, topic?: TopicPattern): MaybePromise<void>;
}

export class Publisher<Msg> implements IPublisher<Msg>, IEmitter<Msg> {
  private readonly subscriptions: Map<ISubscription<Msg>, Unsubscribe>;

  private constructor() {
    this.subscriptions = new Map<ISubscription<Msg>, Unsubscribe>();
  }

  get subscriptionsNumber() {
    return this.subscriptions.size;
  }

  emit(msg: Msg, topic?: string): MaybePromise<void> {
    const consumptionFunctionsToWait = this.subscriptions
      .keys()
      .reduce(
        (acc: Promise<void>[], sub: ISubscription<Msg>): Promise<void>[] => {
          if (sub.filter(msg, topic)) {
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
  }

  subscribe(
    consume: ConsumeFunction<Msg>,
    topic?: TopicPattern,
    contentFilter?: ContentFilterFunction<Msg>,
    strictTopicPatternFiltering: boolean = true
  ): Unsubscribe {
    const subscription: ISubscription<Msg> = new Subscription(
      consume,
      strictTopicPatternFiltering,
      topic,
      contentFilter
    );
    if (this.subscriptions.has(subscription)) {
      return this.subscriptions.get(subscription)!;
    }
    const unsubscribe = () => this.subscriptions.delete(subscription);
    this.subscriptions.set(subscription, unsubscribe);
    return unsubscribe;
  }

  static create<Msg>(): IPublisher<Msg> & IEmitter<Msg> {
    return new Publisher<Msg>();
  }
}
