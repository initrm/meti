import Authenticator, {WrongCredentialsError} from '../src/authenticator.js';

describe('Authenticator Class tests suite', () => {

  test('Performs a login request with correct credentials', async () => {
    const cookies = await Authenticator.login(process.env.TEST_USERNAME, process.env.TEST_PASSWORD);

    expect(cookies).toBeDefined();
    expect(cookies.length).toBeGreaterThan(0);
  });
  
  test('Performs a login request with wrong credentials', async () => {
    await expect(Authenticator.login('wrong.credentials@studenti.unimi.it', 'wrongpassword')).rejects
      .toThrow(new WrongCredentialsError());
  });

});