/**
 * Czyta wiadomości z lokalnego Mailpita (docker compose), żeby testy E2E mogły sprawdzić prawdziwie wysłany e-mail.
 * Adres API można zmienić zmienną MAILPIT_URL.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

type MailpitSearchResult = {
  messages: { ID: string }[];
};

type MailpitMessage = {
  Subject: string;
  Text: string;
};

const getJson = async <T>(path: string): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${MAILPIT_URL}${path}`);
  } catch (error) {
    throw new Error(
      `Mailpit is not reachable at ${MAILPIT_URL}. Run "docker compose up -d".`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(`Mailpit ${path} responded with ${response.status}`);
  }

  return (await response.json()) as T;
};

/** Czeka na pierwszą wiadomość do danego adresu (SMTP dostarcza ją asynchronicznie). */
export const waitForEmail = async (
  to: string,
  timeoutMs = 5000,
): Promise<MailpitMessage> => {
  const query = encodeURIComponent(`to:"${to}"`);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { messages } = await getJson<MailpitSearchResult>(
      `/api/v1/search?query=${query}`,
    );
    const latest = messages[0];

    if (latest) {
      return getJson<MailpitMessage>(`/api/v1/message/${latest.ID}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`No email to ${to} arrived in Mailpit within ${timeoutMs} ms`);
};

/** Unikalny adres, bo Mailpit trzyma wiadomości między uruchomieniami testów. */
export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
