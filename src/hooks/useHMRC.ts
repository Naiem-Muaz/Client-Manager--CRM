import { NextGenAPI } from '../api/NextGenAPI';

/**
 * Initiates the HMRC OAuth 64-8 flow for the Client. 
 * Expected to return the HMRC authorization URL for the user to click.
 */
export async function generateHmrcAuthLink(clientId: string, services: string[]) {
  const response = await NextGenAPI.post(`/api/brain/clients/${clientId}/hmrc/auth-link`, { services });
  return response.data; // e.g., { link: 'https://www.tax.service.gov.uk/...' }
}

/**
 * Checks the status of the OAuth handshake.
 * Returns Authorized or Requested or Pending.
 */
export async function checkHmrcAuthStatus(clientId: string) {
  const response = await NextGenAPI.get(`/api/brain/clients/${clientId}/hmrc/status`);
  return response.data;
}
