const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require('body-parser-xml')(bodyParser);
const multer = require("multer");
const app = express();
const PORT = 8080;


app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.xml());
app.use(bodyParser.urlencoded({extended: true}));

const upload = multer();

//Incoming log
app.use((req, res, next) => {
  setImmediate(() => {
    console.log({
      type: "messageIn",
      body: req.body,
      method: req.method,
      path: req.url.toString(),
      dateTime: new Date().toLocaleString()
    });
  });
  next();
});

//Outgoing log
app.use((req, res, next) => {
  res.on("finish", () =>{
    setImmediate(() => {
      const isError = res.locals.statusCode >= 400;
      console.log({
        type: "messageOut",
        body: res.locals.convertedData,
        dateTime: new Date().toLocaleString(),
        fault: isError ? res.locals.error : undefined,
      });
    });
  });
  next();
});



app.post("/", upload.none(), async (req, res, next) => {
  try {
      const contentType = req.get('Content-Type');
      let request_body;

      if (contentType === 'application/xml') {
        
        const jsonData = JSON.parse(JSON.stringify(req.body.parameters));
        const query = jsonData.query.toString();
        const page = parseInt(jsonData.page);
        req.body = {query, page}
        request_body = req.body;

      } else if (contentType.split(';')[0] === 'multipart/form-data') {
        const query = req.body.query;
        const page = parseInt(req.body.page);
        req.body = {query, page};
        request_body = req.body;
      
      } else if (contentType.split(';')[0] === 'application/json') {
        request_body = req.body;
      } else {
        res.locals.error = new Error().stack;
        res.status(500).send('Unsupported Media Type');
        return;
      }

      const {query, page} = request_body;
      const validatedData = validateInputData(request_body);
      if(validatedData.code !== 200){
        res.locals.statusCode = validatedData.code;
        res.status(validatedData.code).send(validatedData);
      }else{

        
        const pageNumber = parseInt(page) || 1;
        const skippableIndex = pageNumber * 2 - 2; //get the amount to skip, 
        const pageSize = 2;
        
        const apiUrl = `https://dummyjson.com/products/search?q=${query}&limit=${pageSize}&skip=${skippableIndex}`;
        
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        // Return the transformed data
        const convertedData = returnSpecificJsonData(data)
        res.locals.convertedData = convertedData;

        if(req.get('Accept') === 'application/xml'){
          var convert = require('xml-js');
          var options = {compact: true, spaces: 4};      
          var result = convert.json2xml(convertedData, options);
          res.send(result);
        }else{
          res.json(convertedData);
        }
        
      }
  
    } catch (error) {
      res.locals.error = error
    }
});

function returnSpecificJsonData(json_data){
  var products = json_data.products; 
  var specificProductData = [];
  for (let i = 0; i < json_data.products.length; i++) {
    const element = products[i];
    var final_sum =  (element.price - (element.price * element.discountPercentage / 100)).toFixed(2);
    var final_price = parseFloat(final_sum);
    specificProductData.push({
      title: element.title,
      description: element.description,
      final_price: final_price
    })
    
  }
  // console.log(specificProductData);
  var jsonProductData = JSON.parse(JSON.stringify(specificProductData));
  return jsonProductData;
}

function validateInputData(request_body){
  //TODO: Improve validation code, this is bad imo
  const { query, page } = request_body;
  if(!query && !page){
    return {code: 400, message:"Missing both parameters"};
  }
  if (!query){
    return {code: 400, message:"Missing query parameter"};
  }
  if (!page) {
    return {code: 400, message:"Missing page parameter"};
  }
  if (typeof query !== 'string') {
    return {code: 400, message:"Query parameter must be a string"};
  }
  if (!(query.length >= 1)) {
    return {code: 400, message:"Query parameter can't be empty"};
  }
  if (typeof page !== 'number') {
    return {code: 400, message:"Page parameter must be a number"};
  }
  if(!(parseInt(page) >= 1)){
    return {code: 400, message:"Page parameter must be positive number"};
  }
  return {code: 200}
}


app.listen(PORT, () => console.log(`running on http://localhost:${PORT}`));
