/* eslint-disable no-console */
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);
const multer = require('multer');
const convert = require('xml-js');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.xml());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer();

// Incoming log
app.use((req, res, next) => {
  setImmediate(() => {
    console.log({
      type: 'messageIn',
      body: req.body,
      method: req.method,
      path: req.url.toString(),
      dateTime: new Date().toLocaleString(),
    });
  });
  next();
});

// Outgoing log
app.use((req, res, next) => {
  res.on('finish', () => {
    setImmediate(() => {
      const isError = res.locals.statusCode >= 400;
      console.log({
        type: 'messageOut',
        body: res.locals.convertedData,
        dateTime: new Date().toLocaleString(),
        fault: isError ? res.locals.error : undefined,
      });
    });
  });
  next();
});

function returnSpecificJsonData(jsonData) {
  const { products } = jsonData;
  const specificProductData = [];
  for (let i = 0; i < jsonData.products.length; i += 1) {
    const element = products[i];
    const finalSum = (element.price * ((100 - element.discountPercentage) / 100)).toFixed(2);
    const finalPrice = parseFloat(finalSum);
    specificProductData.push({
      title: element.title,
      description: element.description,
      final_price: finalPrice,
    });
  }
  // console.log(specificProductData);
  const jsonProductData = JSON.parse(JSON.stringify(specificProductData));
  return jsonProductData;
}

function validateInputData(requestBody) {
  // TODO: Improve validation code, this is bad imo
  const { query, page } = requestBody;
  if (!query && !page) {
    return { code: 400, message: 'Missing both parameters' };
  }
  if (!query) {
    return { code: 400, message: 'Missing query parameter' };
  }
  if (!page) {
    return { code: 400, message: 'Missing page parameter' };
  }
  if (typeof query !== 'string') {
    return { code: 400, message: 'Query parameter must be a string' };
  }
  if (!(query.length >= 1)) {
    return { code: 400, message: "Query parameter can't be empty" };
  }
  if (typeof page !== 'number') {
    return { code: 400, message: 'Page parameter must be a number' };
  }
  if (!(parseInt(page, 10) >= 1)) {
    return { code: 400, message: 'Page parameter must be positive number' };
  }
  return { code: 200 };
}

app.post('/', upload.none(), async (req, res) => {
  try {
    const contentType = req.get('Content-Type');
    let requestBody;

    if (contentType === 'application/xml') {
      const jsonData = JSON.parse(JSON.stringify(req.body.parameters));
      const query = jsonData.query.toString();
      const page = parseInt(jsonData.page, 10);
      req.body = { query, page };
      requestBody = req.body;
    } else if (contentType.split(';')[0] === 'multipart/form-data') {
      const { query } = req.body;
      const page = parseInt(req.body.page, 10);
      req.body = { query, page };
      requestBody = req.body;
    } else if (contentType.split(';')[0] === 'application/json') {
      requestBody = req.body;
    } else {
      res.locals.error = new Error().stack;
      res.status(500).send('Unsupported Media Type');
      return;
    }

    const { query, page } = requestBody;
    const validatedData = validateInputData(requestBody);
    if (validatedData.code !== 200) {
      res.locals.statusCode = validatedData.code;
      res.status(validatedData.code).send(validatedData);
    } else {
      const pageNumber = parseInt(page, 10) || 1;
      const skippableIndex = pageNumber * 2 - 2; // get the amount to skip,
      const pageSize = 2;

      const apiUrl = `https://dummyjson.com/products/search?q=${query}&limit=${pageSize}&skip=${skippableIndex}`;

      const response = await axios.get(apiUrl);
      const { data } = response;

      // Return the transformed data
      const convertedData = returnSpecificJsonData(data);
      res.locals.convertedData = convertedData;

      if (req.get('Accept') === 'application/xml') {
        const options = { compact: true, spaces: 4 };
        const result = convert.json2xml(convertedData, options);
        res.send(result);
      } else {
        res.json(convertedData);
      }
    }
  } catch (error) {
    res.locals.error = error;
  }
});

app.listen(PORT, () => console.log(`running on http://localhost:${PORT}`));
