declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  }

  interface SendResult {
    statusCode: number;
    headers: Record<string, string>;
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string,
  ): void;

  function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer,
    options?: {
      TTL?: number;
      urgency?: "very-low" | "low" | "normal" | "high";
      topic?: string;
    },
  ): Promise<SendResult>;

  function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };

  export {
    setVapidDetails,
    sendNotification,
    generateVAPIDKeys,
    PushSubscription,
    SendResult,
  };
}
