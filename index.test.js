const request = require('supertest');
const app = require('./index');



describe("Test the output when given correct arguments", () => {
    test("It should response.code 200 the POST method", async() => {
      const response = await request(app)
        .post("/")
        .send({
            query: "phone",
            page: 1
        });
        expect(response.statusCode).toBe(200);
    });
  });

describe("Test the output when given wrong arguments", () => {
    test("It should response.code 400 the POST method", async() => {
    const response = await request(app)
    .post("/")
    .send({
        query: 1,
        page: 1
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch("Query parameter must be a string")
    });
});

describe("Test the accept type", () => {
    test("It should accept type json given xml", async() => {
    const response = await request(app)
    .post("/")
    .set('Content-Type', 'application/xml')
    .set('Accept', 'application/json')
    .send('<parameters><query>book</query><page>2</page></parameters>');
    expect(response.request.get('Content-Type')).toMatch('application/xml');
    expect(response.request.get('Accept')).toMatch('application/json')
    });
});

describe("Test the accept type", () => {
    test("It should accept type xml given json", async() => {
    const response = await request(app)
    .post("/")
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/xml')
    .send({
        query: "mac",
        page: 1
    });
    expect(response.request.get('Content-Type')).toMatch('application/json');
    expect(response.request.get('Accept')).toMatch('application/xml')
    });
});