/**
 * OAuth2 PKCE Authentication Library for PhysioFlow
 * Integrates with Keycloak using the Authorization Code flow with PKCE
 */

import type {
  AuthUser,
  KeycloakTokenClaims,
  LoginOptions,
  LogoutOptions,
  PKCEChallenge,
  TokenInfo,
  TokenResponse,
  UserRole,
} from "@/types/auth";

// Environment configuration
const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:7014";
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "physioflow";
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "physioflow-web";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:7010";
// Use locale-aware callback to avoid middleware redirect stripping query params
const getRedirectUri = () => {
  if (typeof window !== "undefined") {
    const locale = document.documentElement.lang || "vi";
    return `${BASE_URL}/${locale}`;
  }
  return `${BASE_URL}/vi`;
};

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "physioflow_access_token",
  REFRESH_TOKEN: "physioflow_refresh_token",
  ID_TOKEN: "physioflow_id_token",
  TOKEN_EXPIRY: "physioflow_token_expiry",
  CODE_VERIFIER: "physioflow_code_verifier",
  AUTH_STATE: "physioflow_auth_state",
  REDIRECT_PATH: "physioflow_redirect_path",
} as const;

// Keycloak endpoints
function getKeycloakEndpoints() {
  const baseUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
  return {
    authorization: `${baseUrl}/protocol/openid-connect/auth`,
    token: `${baseUrl}/protocol/openid-connect/token`,
    logout: `${baseUrl}/protocol/openid-connect/logout`,
    userinfo: `${baseUrl}/protocol/openid-connect/userinfo`,
    jwks: `${baseUrl}/protocol/openid-connect/certs`,
  };
}

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Create SHA-256 hash of the input string
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

/**
 * Base64 URL encode the input buffer
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE(): Promise<PKCEChallenge> {
  const codeVerifier = generateRandomString(64);
  const hash = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hash);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

/**
 * Decode a JWT token without verification (for client-side use only)
 */
function decodeJWT(token: string): KeycloakTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1]!;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extract user information from token claims
 */
function extractUserFromClaims(claims: KeycloakTokenClaims): AuthUser {
  // Extract roles from realm_access or direct roles claim
  let roles: UserRole[] = [];
  if (claims.roles) {
    roles = claims.roles as UserRole[];
  } else if (claims.realm_access?.roles) {
    roles = claims.realm_access.roles.filter((r) =>
      ["super_admin", "clinic_admin", "therapist", "assistant", "front_desk", "patient"].includes(r)
    ) as UserRole[];
  }

  return {
    id: claims.sub,
    email: claims.email ?? "",
    firstName: claims.given_name ?? "",
    lastName: claims.family_name ?? "",
    username: claims.preferred_username ?? "",
    roles,
    tenantId: claims.tenant_id ?? "default",
    clinicId: claims.clinic_id,
    locale: claims.locale,
    emailVerified: claims.email_verified ?? false,
  };
}

/**
 * Check if access token is expired or about to expire
 */
function isTokenExpired(expiresAt: number, bufferSeconds = 60): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt - bufferSeconds;
}

/**
 * Store tokens in localStorage
 */
function storeTokens(tokenResponse: TokenResponse): TokenInfo {
  const now = Math.floor(Date.now() / 1000);
  const tokenInfo: TokenInfo = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    idToken: tokenResponse.id_token,
    tokenType: tokenResponse.token_type,
    expiresIn: tokenResponse.expires_in,
    expiresAt: now + tokenResponse.expires_in,
    refreshExpiresIn: tokenResponse.refresh_expires_in,
    scope: tokenResponse.scope,
  };

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenResponse.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenResponse.refresh_token);
  if (tokenResponse.id_token) {
    localStorage.setItem(STORAGE_KEYS.ID_TOKEN, tokenResponse.id_token);
  }
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(tokenInfo.expiresAt));

  return tokenInfo;
}

/**
 * Get stored tokens
 */
function getStoredTokens(): TokenInfo | null {
  if (typeof window === "undefined") return null;

  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

  if (!accessToken || !refreshToken || !expiresAt) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    idToken: localStorage.getItem(STORAGE_KEYS.ID_TOKEN) ?? undefined,
    tokenType: "Bearer",
    expiresIn: 0, // Not stored
    expiresAt: parseInt(expiresAt, 10),
    refreshExpiresIn: 0, // Not stored
    scope: "", // Not stored
  };
}

/**
 * Clear all stored tokens
 */
function clearStoredTokens(): void {
  if (typeof window === "undefined") return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get the current user from stored token
 */
export function getCurrentUser(): AuthUser | null {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  const claims = decodeJWT(accessToken);
  if (!claims) return null;

  return extractUserFromClaims(claims);
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;

  // If token is expired, user is not authenticated
  // (they may still be able to refresh, but that's async)
  return !isTokenExpired(tokens.expiresAt);
}

/**
 * Initiate login by redirecting to Keycloak
 */
export async function login(options: LoginOptions = {}): Promise<void> {
  const pkce = await generatePKCE();
  const state = generateRandomString(32);

  // Store PKCE verifier and state
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, pkce.codeVerifier);
  localStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);

  // Store redirect path if provided
  if (options.redirectPath) {
    localStorage.setItem(STORAGE_KEYS.REDIRECT_PATH, options.redirectPath);
  }

  const endpoints = getKeycloakEndpoints();
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: `${getRedirectUri()}/auth/callback`,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  });

  if (options.prompt) {
    params.set("prompt", options.prompt);
  }
  if (options.loginHint) {
    params.set("login_hint", options.loginHint);
  }
  if (options.locale) {
    params.set("ui_locales", options.locale);
  }

  window.location.href = `${endpoints.authorization}?${params.toString()}`;
}

/**
 * Handle the OAuth callback and exchange code for tokens
 */
export async function handleCallback(code: string, state: string): Promise<AuthUser> {
  // Verify state
  const storedState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
  if (!storedState || storedState !== state) {
    throw new Error("Invalid state parameter");
  }

  // Get stored code verifier
  const codeVerifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!codeVerifier) {
    throw new Error("Missing code verifier");
  }

  // Exchange code for tokens
  const endpoints = getKeycloakEndpoints();
  const response = await fetch(endpoints.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: `${getRedirectUri()}/auth/callback`,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description ?? "Failed to exchange code for tokens");
  }

  const tokenResponse: TokenResponse = await response.json();

  // Store tokens
  storeTokens(tokenResponse);

  // Clean up temporary storage
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);

  // Extract and return user
  const claims = decodeJWT(tokenResponse.access_token);
  if (!claims) {
    throw new Error("Failed to decode access token");
  }

  return extractUserFromClaims(claims);
}

/**
 * Get the stored redirect path and clear it
 */
export function getAndClearRedirectPath(): string | null {
  const path = localStorage.getItem(STORAGE_KEYS.REDIRECT_PATH);
  if (path) {
    localStorage.removeItem(STORAGE_KEYS.REDIRECT_PATH);
  }
  return path;
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken(): Promise<TokenInfo | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) {
    return null;
  }

  const endpoints = getKeycloakEndpoints();

  try {
    const response = await fetch(endpoints.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: KEYCLOAK_CLIENT_ID,
        refresh_token: tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      clearStoredTokens();
      return null;
    }

    const tokenResponse: TokenResponse = await response.json();
    return storeTokens(tokenResponse);
  } catch (error) {
    console.error("Failed to refresh token:", error);
    clearStoredTokens();
    return null;
  }
}

/**
 * Ensure a valid access token is available (refresh if needed)
 */
export async function ensureValidToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  // If token is not expired, return it
  if (!isTokenExpired(tokens.expiresAt)) {
    return tokens.accessToken;
  }

  // Try to refresh
  const newTokens = await refreshAccessToken();
  return newTokens?.accessToken ?? null;
}

/**
 * Logout and redirect to Keycloak logout
 */
export async function logout(options: LogoutOptions = {}): Promise<void> {
  const idToken = localStorage.getItem(STORAGE_KEYS.ID_TOKEN);
  const endpoints = getKeycloakEndpoints();

  // Clear local storage first
  clearStoredTokens();

  // Build logout URL
  const params = new URLSearchParams();

  if (options.idTokenHint ?? idToken) {
    params.set("id_token_hint", options.idTokenHint ?? idToken ?? "");
  }

  const postLogoutUri = options.redirectUri ?? `${getRedirectUri()}/auth/login`;
  params.set("post_logout_redirect_uri", postLogoutUri);

  // Redirect to Keycloak logout
  window.location.href = `${endpoints.logout}?${params.toString()}`;
}

/**
 * Silent token refresh - useful for background refresh
 */
export async function silentRefresh(): Promise<boolean> {
  const tokens = getStoredTokens();
  if (!tokens) return false;

  // Only refresh if token is about to expire (within 5 minutes)
  if (!isTokenExpired(tokens.expiresAt, 300)) {
    return true;
  }

  const newTokens = await refreshAccessToken();
  return newTokens !== null;
}

/**
 * Setup automatic token refresh
 */
export function setupTokenRefresh(intervalMs = 60000): () => void {
  const intervalId = setInterval(async () => {
    const tokens = getStoredTokens();
    if (tokens && isTokenExpired(tokens.expiresAt, 120)) {
      await refreshAccessToken();
    }
  }, intervalMs);

  return () => clearInterval(intervalId);
}

// Export types for external use
export type { AuthUser, TokenInfo, LoginOptions, LogoutOptions };
