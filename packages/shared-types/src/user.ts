/**
 * User and authentication types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type UserRole =
  | 'super_admin'
  | 'clinic_admin'
  | 'therapist'
  | 'assistant'
  | 'front_desk';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface User {
  id: string;
  clinicId: string;
  keycloakId?: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  firstNameVi?: string;
  lastNameVi?: string;
  role: UserRole;
  licenseNumber?: string;
  specializations?: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameVi?: string;
  lastNameVi?: string;
  role: UserRole;
  clinicId: string;
  clinicName: string;
  organizationId: string;
  organizationName: string;
}

// -----------------------------------------------------------------------------
// Authentication Types
// -----------------------------------------------------------------------------

export interface AuthClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  preferredUsername: string;
  givenName: string;
  familyName: string;
  userId: string;
  clinicId: string;
  organizationId: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

// -----------------------------------------------------------------------------
// Organization and Clinic Types
// -----------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  nameVi?: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Clinic {
  id: string;
  organizationId: string;
  name: string;
  nameVi?: string;
  address?: string;
  addressVi?: string;
  phone?: string;
  email?: string;
  timezone: string;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateUserRequest {
  clinicId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  firstNameVi?: string;
  lastNameVi?: string;
  role: UserRole;
  licenseNumber?: string;
  specializations?: string[];
}

export interface UpdateUserRequest {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  firstNameVi?: string;
  lastNameVi?: string;
  role?: UserRole;
  licenseNumber?: string;
  specializations?: string[];
  isActive?: boolean;
}

export interface UserSearchParams {
  clinicId: string;
  role?: UserRole;
  isActive?: boolean;
  query?: string;
  page?: number;
  limit?: number;
}
