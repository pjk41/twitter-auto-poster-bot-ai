//? It is advisable to use environment variables instead of directly putting secrets in repository file but I have skipped this part as it would become complicated for many.
//? Alternatively you can download the repository instead or forking and upload it from your account and keep it private, in that way, your secrets will not be exposed to the public.

const APP_KEY = "qnba2eXsnBlhCARq8CU1lRf8W";
const APP_SECRET = "EywH7416aQkRP1ZZ3manlM19RtIQG8ABPuCy1jTRZIlD5167Xp";
const ACCESS_TOKEN = "1515629514369380352-cEpeswQPqjTLMECnrt243EFntxovzB";
const ACCESS_SECRET = "LBX2igzSVS3EAzfo5z9hgqQbU8IyoOZBvuA1h2jBnnT67";
const OPENAI_API_KEY = "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";

const SECRETS = {
  APP_KEY,
  APP_SECRET,
  ACCESS_TOKEN,
  ACCESS_SECRET,
  OPENAI_API_KEY,
};

module.exports = SECRETS;
