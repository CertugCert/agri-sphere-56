import request from 'supertest';
import app from '../src/app.js';

describe('Auth & /me', () => {
  it('rejects /me without token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});
