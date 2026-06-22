import { KeyManagementServiceClient } from "@google-cloud/kms";
import { getServerEnv } from "@/lib/env";

export const KMS_CIPHERTEXT_PREFIX = "gcpkms:v1:";

export interface SecretCipher {
  encrypt(plaintext: string, context: string): Promise<string>;
  decrypt(ciphertext: string, context: string): Promise<string>;
}

let client: KeyManagementServiceClient | undefined;

function getClient(): KeyManagementServiceClient {
  if (client) return client;

  const env = getServerEnv();
  const credentials = JSON.parse(env.GOOGLE_CLOUD_CREDENTIALS_JSON) as {
    client_email: string;
    private_key: string;
    project_id?: string;
  };

  client = new KeyManagementServiceClient({
    credentials,
    projectId: credentials.project_id,
  });
  return client;
}

export const googleKmsCipher: SecretCipher = {
  async encrypt(plaintext, context) {
    const env = getServerEnv();
    const [result] = await getClient().encrypt({
      name: env.GOOGLE_CLOUD_KMS_KEY_NAME,
      plaintext: Buffer.from(plaintext, "utf8"),
      additionalAuthenticatedData: Buffer.from(context, "utf8"),
    });

    if (!result.ciphertext) throw new Error("Cloud KMS returned no ciphertext");
    return `${KMS_CIPHERTEXT_PREFIX}${Buffer.from(result.ciphertext).toString("base64")}`;
  },

  async decrypt(ciphertext, context) {
    if (!ciphertext.startsWith(KMS_CIPHERTEXT_PREFIX)) {
      throw new Error("Refusing to decrypt an unrecognized secret format");
    }

    const env = getServerEnv();
    const encoded = ciphertext.slice(KMS_CIPHERTEXT_PREFIX.length);
    const [result] = await getClient().decrypt({
      name: env.GOOGLE_CLOUD_KMS_KEY_NAME,
      ciphertext: Buffer.from(encoded, "base64"),
      additionalAuthenticatedData: Buffer.from(context, "utf8"),
    });

    if (!result.plaintext) throw new Error("Cloud KMS returned no plaintext");
    return Buffer.from(result.plaintext).toString("utf8");
  },
};
