// Roben.club SSO Integration
const SSO_BASE_URL = 'https://roben.club';

export interface RobenUserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  member_id: string;
  major: string;
  team: string | null;
  user_type: string | null;
  is_new: boolean;
  phone_number: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class RobenSSO {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.roben_sso_client_id || '';
    this.clientSecret = process.env.roben_sso_client_secret || '';
    this.redirectUri = process.env.roben_sso_redirect_uri || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Roben SSO credentials not configured in .env.local');
    }
  }

  /**
   * Step 1: Get authorization URL to redirect user
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'roben',
      response_type: 'code'
    });

    return `${SSO_BASE_URL}/sso/authorize/?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for access token
   */
  async exchangeCodeForToken(authCode: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri
    });

    const response = await fetch(`${SSO_BASE_URL}/sso/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Step 3: Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<RobenUserInfo> {
    const response = await fetch(`${SSO_BASE_URL}/sso/userinfo/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = await response.json();
    
    // Roben.club wraps the user data in a "user" object
    // Return the unwrapped user data
    return data.user || data;
  }
}

// Client-side helper to initiate SSO login
export function initiateRobenSSO() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_ROBEN_SSO_CLIENT_ID || '',
    redirect_uri: process.env.NEXT_PUBLIC_ROBEN_SSO_REDIRECT_URI || '',
    scope: 'roben',
    response_type: 'code'
  });

  window.location.href = `${SSO_BASE_URL}/sso/authorize/?${params.toString()}`;
}
