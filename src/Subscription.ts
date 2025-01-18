export interface ISubscription<Msg = unknown> {
  readonly topic?: TopicPattern;
  readonly strictTopicFiltering: boolean;
  readonly consume: ConsumeFunction<Msg>;
  readonly contentFilter?: ContentFilterFunction<Msg>;
  filter(msg: Msg, topic?: string | number): boolean;
}

export type TopicPattern = string | RegExp | number;
export type ConsumeFunction<I = unknown> = (data: I) => MaybePromise<void>;
export type ContentFilterFunction<I = unknown> = (data: I) => boolean;
export type MaybePromise<T> = T | Promise<T>;

export class Subscription<Msg = unknown> implements ISubscription<Msg> {
  private topicMatcher?: (givenTopic: string | number) => boolean;

  constructor(
    public readonly consume: ConsumeFunction<Msg>,
    public readonly strictTopicFiltering: boolean,
    public readonly topic?: TopicPattern,
    public readonly contentFilter?: ContentFilterFunction<Msg>
  ) {
    if (typeof topic !== "undefined") {
      this.topicMatcher =
        typeof topic === "string" || typeof topic === "number"
          ? (givenTopic: string | number) => givenTopic === topic!
          : (givenTopic: string | number) =>
              givenTopic.toString().match(topic) !== null;
    }
  }

  filter(msg: Msg, topic?: string | number): boolean {
    return (
      this.matchTopic(topic) && (!this.contentFilter || this.contentFilter(msg))
    );
  }

  private matchTopic(topic: string | number | undefined): boolean {
    if (typeof this.topic === "undefined") {
      return true;
    }
    if (typeof topic === "undefined") {
      return !this.strictTopicFiltering;
    }
    return !this.topicMatcher || this.topicMatcher(topic);
  }
}
