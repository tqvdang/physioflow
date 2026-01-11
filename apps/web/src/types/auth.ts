/**
 * Authentication types for PhysioFlow Web Application
 */

/**
 * User roles in the system
 */
export type UserRole =
  | "super_admin"
  | "clinic_admin"
  | "therapist"
  | "assistant"
  | "front_desk"
  | "patient";

/**
 * Role hierarchy for permission checks
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  clinic_admin: 80,
  therapist: 60,
  assistant: 40,
  front_desk: 30,
  patient: 10,
};

/**
 * User information extracted from authentication token
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  roles: UserRole[];
  tenantId: string;
  clinicId?: string;
  locale?: string;
  emailVerified: boolean;
}

/**
 * Token information
 */
export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
  refreshExpiresIn: number;
  scope: string;
}

/**
 * Authentication session
 */
export interface AuthSession {
  user: AuthUser;
  tokens: TokenInfo;
  isAuthenticated: boolean;
}

/**
 * Authentication state for the application
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
}

/**
 * Token claims from Keycloak JWT
 */
export interface KeycloakTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  roles?: string[];
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  tenant_id?: string;
  clinic_id?: string;
  locale?: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string | string[];
  azp?: string;
  scope?: string;
}

/**
 * PKCE code verifier and challenge
 */
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

/**
 * OAuth2 authorization request parameters
 */
export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  nonce?: string;
  prompt?: string;
  loginHint?: string;
  uiLocales?: string;
}

/**
 * OAuth2 token request parameters
 */
export interface TokenRequest {
  grantType: "authorization_code" | "refresh_token";
  clientId: string;
  redirectUri?: string;
  code?: string;
  codeVerifier?: string;
  refreshToken?: string;
}

/**
 * OAuth2 token response from Keycloak
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  scope: string;
  session_state?: string;
}

/**
 * Login options
 */
export interface LoginOptions {
  redirectPath?: string;
  prompt?: "none" | "login" | "consent" | "select_account";
  loginHint?: string;
  locale?: string;
}

/**
 * Logout options
 */
export interface LogoutOptions {
  redirectUri?: string;
  idTokenHint?: string;
}

/**
 * Role permission check helpers
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

export function hasAnyRole(user: AuthUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

export function hasAllRoles(user: AuthUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.every((role) => user.roles.includes(role));
}

export function isAtLeastRole(user: AuthUser | null, minRole: UserRole): boolean {
  if (!user || user.roles.length === 0) return false;
  const minLevel = ROLE_HIERARCHY[minRole];
  return user.roles.some((role) => ROLE_HIERARCHY[role] >= minLevel);
}

/**
 * Staff roles (non-patient)
 */
export const STAFF_ROLES: UserRole[] = [
  "super_admin",
  "clinic_admin",
  "therapist",
  "assistant",
  "front_desk",
];

/**
 * Admin roles
 */
export const ADMIN_ROLES: UserRole[] = ["super_admin", "clinic_admin"];

/**
 * Clinical roles (can access patient records)
 */
export const CLINICAL_ROLES: UserRole[] = [
  "super_admin",
  "clinic_admin",
  "therapist",
  "assistant",
];
