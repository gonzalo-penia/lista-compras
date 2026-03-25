/**
 * URL base de la API.
 *
 * En desarrollo:
 *   - Emulador Android  → http://10.0.2.2:3001
 *   - Dispositivo físico → http://<TU_IP_LOCAL>:3001  (ej: http://192.168.1.100:3001)
 *
 * En producción reemplazá este valor por la URL real del servidor.
 */
export const API_URL = __DEV__
  ? 'http://10.0.2.2:3001'
  : 'https://api.familycart.app';
