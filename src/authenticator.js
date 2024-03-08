import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import Routes from './routes.js';

// axios configuration, custom redirect handling
axios.defaults.maxRedirects = 0;
axios.interceptors.response.use((response) => response, (error) => { // on redirect
  if (error.response && [301, 302].includes(error.response.status)) {
    // grabs the redirect url
    const redirectUrl = error.response.headers.location;

    // retrieves the cookies from the last request and the response
    const oldCookies = error.config.headers['Cookie'] || [];
    const newCookies = error.response.headers['set-cookie'] || [];

    // merges the cookies to be sent in the next request
    const cookies = new Array(...oldCookies);
    const names = cookies.map((cookie) => cookie.split(';')[0].split('=')[0]);
    newCookies.forEach((newCookie) => {
      const name = newCookie.split(';')[0].split('=')[0];
      const idx = names.indexOf(name);
      if (idx === -1) 
        cookies.push(newCookie);
      else
        cookies[idx] = newCookie;
    });

    // follows the redirect
    return axios.get(redirectUrl, {headers: {
      'Cookie': cookies,
    }});
  }

  // rejects the promise if the response is not a redirect
  return Promise.reject(error);
});

/**
 * Authenticator class that handles the login process and returns the session cookies
 */
class Authenticator {

  /**
   * Logs in the user and returns the session cookies
   * 
   * @param {string} username - The user's username
   * @param {string} password - The user's password
   * @throws {WrongCredentialsError} If the login fails due to invalid credentials
   * @throws {AxiosError} If the login fails due to other reasons
   * @returns {string} The authenticated session cookies
   */
  static async login(username, password) {
    // requests the login
    const loginPage = await axios.get(Routes.Login);

    // grabs the session cookies and creates the form inputs
    const cookies = loginPage.headers['set-cookie'];
    const $ = cheerio.load(loginPage.data);
    const formData = {username, password, selTipoUtente: 'S'};

    // adds the form server-generated input data to the form data
    const inputs = $('form input');
    for (let i = 0; i < inputs.length; i++)
      if (inputs[i].attribs.name !== undefined && inputs[i].attribs.value !== '')
        formData[inputs[i].attribs.name] = inputs[i].attribs.value;

    try {
      // performs the login request
      const authResponse = await axios.post(Routes.PostLogin, formData, {
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // returns the auth cookies
      return authResponse.config.headers.Cookie;
    }
    catch(error) {
      if (error.response?.status === 401)
        throw new WrongCredentialsError();
      throw error;
    }
  }

}

/**
 * Custom error class for the Authenticator class
 */
export class AuthenticatorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticatorError';
  }
}

/**
 * Custom error class for wrong credentials scenario
 */
export class WrongCredentialsError extends AuthenticatorError {
  constructor() {
    super('Wrong credentials');
    this.code = 'WRONG_CREDENTIALS';
  }
}

export default Authenticator;