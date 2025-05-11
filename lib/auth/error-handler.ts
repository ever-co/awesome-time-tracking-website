import {
  createAppError,
  ErrorType,
  validateEnvVariables,
  logError,
} from "../utils/error-handler";
export { logError } from "../utils/error-handler";

/**
 * Validates required environment variables for authentication providers
 */
export function validateAuthConfig() {
  // Base NextAuth environment variables
  const baseNextAuthVars = ["NEXTAUTH_SECRET", "NEXTAUTH_URL"];

  // Provider-specific environment variables
  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    microsoft: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  };

  // Check base NextAuth variables but don't throw errors
  const baseError = validateEnvVariables(baseNextAuthVars);
  if (baseError) {
    // Just log a warning instead of throwing an error
    console.warn(`[AUTH CONFIG WARNING] NextAuth base configuration incomplete: ${baseError.message}`);
    console.warn('Authentication features may be limited.');
  }

  // Check which providers are enabled based on environment variables
  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every((varName) => !!process.env[varName]?.trim());
    enabledProviders[provider] = hasAllVars;

    // Log warning for partially configured providers
    if (!hasAllVars && vars.some((varName) => !!process.env[varName]?.trim())) {
      const missingVars = vars.filter((varName) => !process.env[varName]?.trim());
      const warning = createAppError(
        `Partial configuration for ${provider} provider. Missing: ${missingVars.join(
          ", "
        )}`,
        ErrorType.CONFIG,
        "ENV_PARTIAL"
      );
      logError(warning, "Auth Config");
    }
  });

  return enabledProviders;
}

/**
 * Safely configures OAuth providers based on available environment variables
 */
export function configureOAuthProviders() {
  const enabledProviders = validateAuthConfig();

  const providers: { id: string; clientId?: string; clientSecret?: string }[] =
    [];

  // Define provider configurations
  const providerConfigs = [
    {
      id: "google",
      enabled: enabledProviders.google,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    {
      id: "github",
      enabled: enabledProviders.github,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    {
      id: "facebook",
      enabled: enabledProviders.facebook,
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    {
      id: "microsoft",
      enabled: enabledProviders.microsoft,
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    },
  ];

  providerConfigs.forEach((config) => {
    if (config.enabled) {
      providers.push({
        id: config.id,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      });
    }
  });

  return providers;
}

/**
 * Handles authentication errors with appropriate messages
 */
export function handleAuthError(error: any): { error: string } {
  let errorMessage = "An unknown authentication error occurred";

  if (error instanceof Error) {
    // Handle specific error types
    const errorMessageMap = [
      {
        pattern: /GOOGLE_CLIENT_ID/i,
        message: "Google authentication is not properly configured",
      },
      {
        pattern: /GITHUB_CLIENT_ID/i,
        message: "GitHub authentication is not properly configured",
      },
      {
        pattern: /FACEBOOK_CLIENT_ID/i,
        message: "Facebook authentication is not properly configured",
      },
      {
        pattern: /MICROSOFT_CLIENT_ID/i,
        message: "Microsoft authentication is not properly configured",
      },
      {
        pattern: /SUPABASE/i,
        message: "Supabase authentication is not properly configured",
      },
      { pattern: /NEXTAUTH/i, message: "NextAuth is not properly configured" },
    ];
    // Find matching pattern or use original message
    const matchingError = errorMessageMap.find((item) =>
      item.pattern.test(error.message)
    );
    errorMessage = matchingError ? matchingError.message : error.message;

    logError(error, "Authentication");
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  return { error: errorMessage };
}
