// Datos de prueba para los E2E de autenticación. Las credenciales reales
// nunca se hardcodean ni se commitean: viven en variables de entorno y deben
// corresponder a un usuario ya existente y confirmado en el proyecto
// Supabase contra el que corre la suite (ver E2E_USER_EMAIL/E2E_USER_PASSWORD
// en apps/web/.env.local — documentadas en apps/web/.env.example).
export interface TestUser {
  email: string
  password: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Los E2E de autenticación requieren un ` +
        `usuario real y confirmado en Supabase — definí E2E_USER_EMAIL y ` +
        `E2E_USER_PASSWORD en apps/web/.env.local antes de correr esta suite.`
    )
  }
  return value
}

export function getValidTestUser(): TestUser {
  return {
    email: requireEnv('E2E_USER_EMAIL'),
    password: requireEnv('E2E_USER_PASSWORD'),
  }
}
