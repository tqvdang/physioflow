package config

import (
	"os"
	"strconv"
)

// Config holds all application configuration.
type Config struct {
	Env      string
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Keycloak KeycloakConfig
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Port         string
	ReadTimeout  int
	WriteTimeout int
}

// DatabaseConfig holds database connection settings.
type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime int
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	URL      string
	Password string
	DB       int
}

// JWTConfig holds JWT authentication settings.
type JWTConfig struct {
	Secret     string
	Issuer     string
	Expiration int
}

// KeycloakConfig holds Keycloak integration settings.
type KeycloakConfig struct {
	URL      string
	Realm    string
	ClientID string
	Secret   string
}

// Load reads configuration from environment variables.
func Load() (*Config, error) {
	return &Config{
		Env: getEnv("ENV", "development"),
		Server: ServerConfig{
			Port:         getEnv("PORT", "7011"),
			ReadTimeout:  getEnvAsInt("SERVER_READ_TIMEOUT", 30),
			WriteTimeout: getEnvAsInt("SERVER_WRITE_TIMEOUT", 30),
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", "postgres://emr:emr_secret_dev_only@localhost:7012/physioflow?sslmode=disable"),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getEnvAsInt("DB_CONN_MAX_LIFETIME", 300),
		},
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "localhost:7013"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", ""),
			Issuer:     getEnv("JWT_ISSUER", "physioflow"),
			Expiration: getEnvAsInt("JWT_EXPIRATION", 3600),
		},
		Keycloak: KeycloakConfig{
			URL:      getEnv("KEYCLOAK_URL", "http://localhost:7014"),
			Realm:    getEnv("KEYCLOAK_REALM", "physioflow"),
			ClientID: getEnv("KEYCLOAK_CLIENT_ID", "physioflow-api"),
			Secret:   getEnv("KEYCLOAK_SECRET", ""),
		},
	}, nil
}

// IsDevelopment returns true if running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

// IsProduction returns true if running in production mode.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
