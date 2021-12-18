import request from 'supertest';
import { StatusCodes } from 'http-status-codes';
import app from './index.js';
import { User } from './models.js';

describe('Identity API endpoints', () => {
  const base = '/api/v1/users';
  let agent;
  let artist, admin;
  beforeAll(() => {
    agent = request.agent(app.instance);
    artist = {
      firstname: 'Angel',
      lastname: 'Pina Santana',
      username: '0aps',
      email: 'test.artist@gmail.com',
      password: 'longpassword',
      password_confirm: 'longpassword',
      phone: '8297413515',
      address: 'my address, my address2',
      role: 'artist'
    };
    admin = { ...artist, email: 'test.admin@gmail.com', role: 'admin' };
  });
  afterAll(async () => {
    await User.deleteMany({ 'login.email': /.*test.*/i });
    return app.close();
  });

  describe('Users endpoints', () => {
    test('should return an error if user is not authenticated', async () => {
      const response = await agent.get(base);
      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body).toHaveProperty('message');
    });

    test('should return an error if user is not authorized', async () => {
      await agent.post(base).send(artist);
      const $artist = await agent.post(`${base}/login`).send({ email: artist.email, password: artist.password });
      const response = await agent.set('Authorization', `Bearer ${$artist.body.token}`).get(base);
      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
      expect(response.body).toHaveProperty('message');
    });

    test('should return the lists of users if admin', async () => {
      await agent.post(base).send(admin);
      const $admin = await agent.post(`${base}/login`).send({ email: admin.email, password: admin.password });
      const response = await agent.set('Authorization', `Bearer ${$admin.body.token}`).get(base);
      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.body).toBeInstanceOf(Array);
    });

    test('should return an error if password is too short', async () => {
      const $user = { ...artist, password: 'short', password_confirm: 'short' };
      const response = await agent.post(base).send($user);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('message');
    });

    test('should return an error if password\'s don\'t match', async () => {
      const $user = { ...artist, password_confirm: 'newpassword' };
      const response = await agent.post(base, $user).send($user);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('message');
    });

    test('should create an user if payload is valid', async () => {
      const $user = { ...artist, email: 'test.newuser@gmail.com' };
      const response = await agent.post(base).send($user);

      expect(response.statusCode).toBe(StatusCodes.CREATED);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).not.toHaveProperty('password');
    });

    test('should return an error if email already exists', async () => {
      const $user = { ...artist };
      const response = await agent.post(base).send($user);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Login endpoints', () => {
    test('should return an error if email field is missing', async () => {
      const response = await agent.post(`${base}/login`).send({});
      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body).toBeInstanceOf(Object);
    });

    test('should return an error if user doesn\'t exists', async () => {
      const response = await agent.post(`${base}/login`).send({
        email: 'not.found@gmail.com',
        password: 'longpassword'
      });
      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('message');
    });

    test('should return the token if login success', async () => {
      const response = await agent.post(`${base}/login`).send({
        email: 'test.artist@gmail.com',
        password: 'longpassword'
      });
      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('token');
    });
  });
});
